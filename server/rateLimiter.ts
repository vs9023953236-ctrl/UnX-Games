import { Request, Response, NextFunction } from 'express';
import { db, pool } from '../src/db/index.js';
import { rate_limits } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';
import { RATE_LIMIT_CONFIG, RateLimitRule } from './rateLimitConfig.js';
import { AuthRequest } from './auth.js';

// In-Memory Fallback Cache for Serverless/Transient Failover
interface LocalMemoryEntry {
  count: number;
  expiresAt: number;
}
const localMemoryStore = new Map<string, LocalMemoryEntry>();


/**
 * Intelligently extracts the real client IP address from proxy headers
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

  const xClientIp = req.headers['x-client-ip'];
  if (typeof xClientIp === 'string' && xClientIp.trim()) return xClientIp.trim();

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Normalizes email or identifier string (trim + lowercase) to prevent bypasses
 */
export function normalizeIdentifier(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  return val.trim().toLowerCase();
}

export interface RateCheckResult {
  count: number;
  limit: number;
  remaining: number;
  expiresAt: Date;
  isBlocked: boolean;
  retryAfterSec: number;
}

/**
 * Central Atomic Rate Limiter with Database Persistence and Fail-Safe Fallback
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateCheckResult> {
  const nowMs = Date.now();
  const defaultExpiresAt = new Date(nowMs + windowMs);

  try {
    // Atomic Postgres UPSERT Query
    const result = await pool.query(`
      INSERT INTO rate_limits (key, count, expires_at, created_at, updated_at)
      VALUES ($1, 1, $2, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
      SET
        count = CASE
          WHEN rate_limits.expires_at < NOW() THEN 1
          ELSE rate_limits.count + 1
        END,
        expires_at = CASE
          WHEN rate_limits.expires_at < NOW() THEN $2
          ELSE rate_limits.expires_at
        END,
        updated_at = NOW()
      RETURNING count, expires_at;
    `, [key, defaultExpiresAt]);

    const row = result?.rows?.[0] as { count: number; expires_at: string | Date } | undefined;

    if (row) {
      const count = Number(row.count) || 1;
      const expiresAt = new Date(row.expires_at);
      const isBlocked = count > limit;
      const remaining = Math.max(0, limit - count);
      const retryAfterSec = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

      return {
        count,
        limit,
        remaining,
        expiresAt,
        isBlocked,
        retryAfterSec,
      };
    }
  } catch (err: any) {
    console.warn(`⚠️ [RATE LIMITER] Database rate-limit fallback triggered for key [${key}]:`, err?.message || err);
  }

  // --- Fail-Safe In-Memory Fallback ---
  const existing = localMemoryStore.get(key);
  if (!existing || existing.expiresAt < nowMs) {
    const entry: LocalMemoryEntry = {
      count: 1,
      expiresAt: nowMs + windowMs,
    };
    localMemoryStore.set(key, entry);
    return {
      count: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      expiresAt: new Date(entry.expiresAt),
      isBlocked: false,
      retryAfterSec: 0,
    };
  } else {
    existing.count += 1;
    localMemoryStore.set(key, existing);
    const isBlocked = existing.count > limit;
    const remaining = Math.max(0, limit - existing.count);
    const retryAfterSec = Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000));

    return {
      count: existing.count,
      limit,
      remaining,
      expiresAt: new Date(existing.expiresAt),
      isBlocked,
      retryAfterSec,
    };
  }
}

/**
 * Resets a rate limit counter (e.g. after a successful login)
 */
export async function resetRateLimitKey(key: string): Promise<void> {
  localMemoryStore.delete(key);
  try {
    await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key};`);
  } catch (e: any) {
    console.warn(`⚠️ [RATE LIMITER] Reset key error for [${key}]:`, e?.message || e);
  }
}

/**
 * Express Middleware Factory
 */
export function createRateLimiter(
  rule: RateLimitRule,
  keyGenerator?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || authReq.user?.supabase_auth_user_id;

    let key = '';
    if (keyGenerator) {
      key = keyGenerator(req);
    } else if (userId) {
      key = `user:${userId}:${rule.actionName}`;
    } else {
      key = `ip:${ip}:${rule.actionName}`;
    }

    const check = await checkRateLimit(key, rule.limit, rule.windowMs);

    // Set standard Rate Limit Headers
    res.setHeader('X-RateLimit-Limit', rule.limit);
    res.setHeader('X-RateLimit-Remaining', check.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(check.expiresAt.getTime() / 1000));

    if (check.isBlocked) {
      res.setHeader('Retry-After', check.retryAfterSec);

      // Safe Security Logging (No secrets, no passwords, no tokens)
      console.warn(`🛡️ [SECURITY] Rate limit triggered: action=${rule.actionName}, key=${key}, ip=${ip}, retryAfter=${check.retryAfterSec}s`);

      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: `Too many attempts. Please try again in ${check.retryAfterSec} seconds.`,
        retryAfter: check.retryAfterSec,
      });
    }

    next();
  };
}

/**
 * Multi-Rule Rate Checker (e.g. OTP Send checking Email 10m, Email 1h, and IP 1h simultaneously)
 */
export async function enforceMultiRateLimits(
  req: Request,
  res: Response,
  checks: Array<{ key: string; rule: RateLimitRule }>
): Promise<boolean> {
  const ip = getClientIp(req);
  let worstCheck: RateCheckResult | null = null;
  let worstRule: RateLimitRule | null = null;

  const results = await Promise.all(
    checks.map(item => checkRateLimit(item.key, item.rule.limit, item.rule.windowMs))
  );

  for (let i = 0; i < results.length; i++) {
    const check = results[i];
    const rule = checks[i].rule;

    if (check.isBlocked) {
      if (!worstCheck || check.retryAfterSec > worstCheck.retryAfterSec) {
        worstCheck = check;
        worstRule = rule;
      }
    }
  }

  if (worstCheck && worstRule) {
    res.setHeader('X-RateLimit-Limit', worstRule.limit);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', Math.ceil(worstCheck.expiresAt.getTime() / 1000));
    res.setHeader('Retry-After', worstCheck.retryAfterSec);

    console.warn(`🛡️ [SECURITY] Multi-rule rate limit triggered: action=${worstRule.actionName}, ip=${ip}, retryAfter=${worstCheck.retryAfterSec}s`);

    let customMsg = `Too many attempts. Please try again in ${worstCheck.retryAfterSec} seconds.`;
    if (worstRule.actionName === 'otp-resend-cooldown') {
      customMsg = `Please wait ${worstCheck.retryAfterSec} seconds before requesting a new verification code.`;
    } else if (worstRule.actionName === 'supabase-email-1h') {
      customMsg = `Hourly email limit reached for this period (30 emails/hour). Please try again in ${Math.ceil(worstCheck.retryAfterSec / 60)} minute(s).`;
    } else if (worstRule.actionName === 'supabase-signup-signin-5m' || worstRule.actionName === 'login-ip') {
      customMsg = `Too many sign-in / sign-up requests (maximum 30 per 5 minutes). Please try again in ${worstCheck.retryAfterSec} seconds.`;
    } else if (worstRule.actionName === 'supabase-token-verify-5m' || worstRule.actionName === 'otp-verify-ip-5m') {
      customMsg = `Too many verification attempts (maximum 30 per 5 minutes). Please try again in ${worstCheck.retryAfterSec} seconds.`;
    }

    res.status(429).json({
      success: false,
      error: 'RATE_LIMITED',
      message: customMsg,
      retryAfter: worstCheck.retryAfterSec,
    });
    return false; // Rate limited
  }

  return true; // Allowed
}

// Special Auth Account Brute Force Protection Helpers
export async function recordFailedLoginAttempt(email: string, ip: string): Promise<void> {
  const cleanEmail = normalizeIdentifier(email);
  if (!cleanEmail) return;

  const accountKey = `login-account:${cleanEmail}`;
  const ipKey = `login-ip:${ip}`;

  await checkRateLimit(accountKey, RATE_LIMIT_CONFIG.LOGIN_ACCOUNT.limit, RATE_LIMIT_CONFIG.LOGIN_ACCOUNT.windowMs);
  await checkRateLimit(ipKey, RATE_LIMIT_CONFIG.LOGIN_IP.limit, RATE_LIMIT_CONFIG.LOGIN_IP.windowMs);
}

export async function resetFailedLoginAttempt(email: string, ip: string): Promise<void> {
  const cleanEmail = normalizeIdentifier(email);
  if (cleanEmail) {
    await resetRateLimitKey(`login-account:${cleanEmail}`);
  }
  await resetRateLimitKey(`login-ip:${ip}`);
}
