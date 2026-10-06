/**
 * UNX Games - Master API Rate Limiting & Abuse Protection Engine
 * 
 * Engineering Architecture:
 * - Algorithms: FIXED_WINDOW, SLIDING_WINDOW, TOKEN_BUCKET, LEAKY_BUCKET
 * - Multi-Worker Consistency & Atomic Counters
 * - Granular Endpoint Categories (Auth, OTP, Orders, Payments, Wallet, Public, Admin)
 * - Dynamic Super Admin Configuration & Safe Defaults
 * - Real-Time Abuse Detection, Security Events & HTTP 429 / Retry-After Handling
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../../src/db/index.js';
import { controlCenter } from './controlCenter.js';
import { redisCheckRateLimit, redisCheckSlidingWindow, redisCheckTokenBucket, getRedisStatus } from '../redis.js';

export type RateLimiterAlgorithm = 'FIXED_WINDOW' | 'SLIDING_WINDOW' | 'TOKEN_BUCKET' | 'LEAKY_BUCKET';

export interface RateLimitPolicy {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  algorithm: RateLimiterAlgorithm;
  limit: number;            // Max requests per window
  windowMs: number;         // Window duration in ms
  capacity?: number;        // Token/Leaky bucket burst capacity
  refillRate?: number;      // Tokens added per second (Token Bucket)
  costPerRequest?: number;  // Cost in tokens (default 1)
  leakRate?: number;        // Requests leaked per second (Leaky Bucket)
  enabled: boolean;
  isCritical: boolean;      // Critical security endpoints cannot be turned off without explicit Super Admin bypass
  totalAllowed: number;
  totalBlocked: number;
  lastTriggered?: string | null;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  algorithm: RateLimiterAlgorithm;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSec: number;
  reason?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type:
    | 'RATE_LIMITED'
    | 'LOGIN_BRUTE_FORCE'
    | 'OTP_RATE_LIMITED'
    | 'PASSWORD_RESET_RATE_LIMITED'
    | '2FA_RATE_LIMITED'
    | 'ORDER_RATE_LIMITED'
    | 'PAYMENT_RATE_LIMITED'
    | 'WALLET_RATE_LIMITED'
    | 'R2_RATE_LIMITED';
  endpoint: string;
  method: string;
  identifier: string;
  ip: string;
  userId?: string;
  requestId: string;
  retryAfterSec: number;
}

// In-Memory Shared State Structures
interface SlidingWindowEntry {
  timestamps: number[];
}

interface TokenBucketEntry {
  tokens: number;
  lastRefillTime: number;
}

interface LeakyBucketEntry {
  waterLevel: number;
  lastLeakTime: number;
}

export class RateLimitService {
  private static instance: RateLimitService;

  // Policies Store
  private policies: Map<string, RateLimitPolicy> = new Map();

  // In-Memory Fast State stores for complex window models
  private fixedWindows: Map<string, number> = new Map();
  private slidingWindows: Map<string, SlidingWindowEntry> = new Map();
  private tokenBuckets: Map<string, TokenBucketEntry> = new Map();
  private leakyBuckets: Map<string, LeakyBucketEntry> = new Map();

  // Telemetry & Security Events
  private securityEvents: SecurityEvent[] = [];
  private totalRequests = 0;
  private totalAllowed = 0;
  private totalBlocked = 0;
  private requestTimestamps: number[] = [];

  private constructor() {
    this.initializeDefaultPolicies();
    this.startCleanupLoop();
  }

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  public reset(): void {
    this.fixedWindows.clear();
    this.slidingWindows.clear();
    this.tokenBuckets.clear();
    this.leakyBuckets.clear();
    this.securityEvents = [];
    this.totalRequests = 0;
    this.totalAllowed = 0;
    this.totalBlocked = 0;
    this.requestTimestamps = [];
  }

  /**
   * Initializes canonical production-grade rate limit policies
   */
  private initializeDefaultPolicies() {
    const defaultList: RateLimitPolicy[] = [
      {
        id: 'AUTH_LOGIN',
        name: 'Login Brute Force Protection',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        algorithm: 'SLIDING_WINDOW',
        limit: 5,
        windowMs: 60 * 1000, // 5 requests / 60s
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'AUTH_SIGNUP',
        name: 'Account Signup Anti-Bot Limit',
        endpoint: '/api/v1/auth/signup',
        method: 'POST',
        algorithm: 'FIXED_WINDOW',
        limit: 5,
        windowMs: 5 * 60 * 1000, // 5 requests / 5 mins
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'OTP_SEND',
        name: 'OTP Dispatch & Cooldown Protection',
        endpoint: '/api/v1/auth/otp/send',
        method: 'POST',
        algorithm: 'TOKEN_BUCKET',
        limit: 3,
        windowMs: 10 * 60 * 1000, // 3 requests / 10m
        capacity: 3,
        refillRate: 0.005, // 1 token every 200s
        costPerRequest: 1,
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'OTP_VERIFY',
        name: 'OTP Attempt Verification Shield',
        endpoint: '/api/v1/auth/otp/verify',
        method: 'POST',
        algorithm: 'SLIDING_WINDOW',
        limit: 5,
        windowMs: 5 * 60 * 1000, // 5 attempts / 5 mins
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'PASSWORD_RESET',
        name: 'Password Reset Enumeration Shield',
        endpoint: '/api/v1/auth/forgot-password',
        method: 'POST',
        algorithm: 'SLIDING_WINDOW',
        limit: 3,
        windowMs: 15 * 60 * 1000, // 3 requests / 15 mins
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: '2FA_VERIFY',
        name: 'Two-Factor Authentication Shield',
        endpoint: '/api/v1/auth/2fa/verify',
        method: 'POST',
        algorithm: 'SLIDING_WINDOW',
        limit: 5,
        windowMs: 5 * 60 * 1000, // 5 attempts / 5 mins
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'PUBLIC_API',
        name: 'Public Catalog Data (Fair Access)',
        endpoint: '/api/v1/products',
        method: 'GET',
        algorithm: 'TOKEN_BUCKET',
        limit: 120,
        windowMs: 60 * 1000,
        capacity: 120,
        refillRate: 10, // 10 tokens/sec
        costPerRequest: 1,
        enabled: true,
        isCritical: false,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'ORDER_CREATE',
        name: 'Order Creation Transaction Throttle',
        endpoint: '/api/v1/orders',
        method: 'POST',
        algorithm: 'TOKEN_BUCKET',
        limit: 15,
        windowMs: 60 * 1000,
        capacity: 15,
        refillRate: 1, // 1 token every second
        costPerRequest: 1,
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'PAYMENT',
        name: 'Payment Initiation & Verification',
        endpoint: '/api/v1/payments/verify',
        method: 'POST',
        algorithm: 'TOKEN_BUCKET',
        limit: 10,
        windowMs: 60 * 1000,
        capacity: 10,
        refillRate: 0.5, // 1 token every 2 seconds
        costPerRequest: 1,
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'WALLET',
        name: 'Wallet Ledger Operations Guard',
        endpoint: '/api/v1/wallet/pay-order',
        method: 'POST',
        algorithm: 'SLIDING_WINDOW',
        limit: 10,
        windowMs: 60 * 1000, // 10 transactions / 60s
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'R2_UPLOAD',
        name: 'Cloudflare R2 Media Upload Limit',
        endpoint: '/api/v1/upload',
        method: 'POST',
        algorithm: 'TOKEN_BUCKET',
        limit: 20,
        windowMs: 60 * 1000,
        capacity: 20,
        refillRate: 0.5,
        costPerRequest: 1,
        enabled: true,
        isCritical: false,
        totalAllowed: 0,
        totalBlocked: 0,
      },
      {
        id: 'ADMIN_API',
        name: 'Privileged Admin Management APIs',
        endpoint: '/api/v1/admin/*',
        method: 'ALL',
        algorithm: 'TOKEN_BUCKET',
        limit: 150,
        windowMs: 60 * 1000,
        capacity: 150,
        refillRate: 20, // 20 tokens/sec
        costPerRequest: 1,
        enabled: true,
        isCritical: true,
        totalAllowed: 0,
        totalBlocked: 0,
      },
    ];

    for (const p of defaultList) {
      this.policies.set(p.id, p);
    }
  }

  private startCleanupLoop() {
    // Prune expired sliding windows & token buckets every 60 seconds
    setInterval(() => {
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter((t) => t > now - 60000);

      // Clean sliding window timestamps older than 15 mins
      for (const [key, entry] of this.slidingWindows.entries()) {
        entry.timestamps = entry.timestamps.filter((t) => t > now - 15 * 60000);
        if (entry.timestamps.length === 0) {
          this.slidingWindows.delete(key);
        }
      }
    }, 60000);
  }

  // --------------------------------------------------------------------------
  // ALGORITHM IMPLEMENTATIONS
  // --------------------------------------------------------------------------

  /**
   * 1. FIXED WINDOW ALGORITHM
   * Resets counter at exact window boundaries (now / windowMs).
   */
  public async checkFixedWindow(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const currentWindowIndex = Math.floor(now / windowMs);
    const windowKey = `${key}:fw:${currentWindowIndex}`;
    const windowResetTime = (currentWindowIndex + 1) * windowMs;
    const retryAfterSec = Math.max(1, Math.ceil((windowResetTime - now) / 1000));

    const currentMemCount = (this.fixedWindows.get(windowKey) || 0) + 1;
    this.fixedWindows.set(windowKey, currentMemCount);

    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || Boolean(process.env.VITEST)) {
      const allowed = currentMemCount <= limit;
      return {
        allowed,
        algorithm: 'FIXED_WINDOW',
        limit,
        remaining: Math.max(0, limit - currentMemCount),
        resetTimeMs: windowResetTime,
        retryAfterSec: allowed ? 0 : retryAfterSec,
      };
    }

    // Check Redis if connected
    if (getRedisStatus() === 'ok') {
      try {
        const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
        const rResult = await redisCheckRateLimit(key, limit, windowSec);
        return {
          allowed: rResult.allowed,
          algorithm: 'FIXED_WINDOW',
          limit,
          remaining: rResult.remaining,
          resetTimeMs: rResult.resetTimeMs,
          retryAfterSec: rResult.retryAfterSec,
        };
      } catch {
        // Fall back to PG / memory
      }
    }

    try {
      // Atomic increment in Postgres for multi-worker consistency
      const result = await pool.query(
        `
        INSERT INTO rate_limits (key, count, expires_at, created_at, updated_at)
        VALUES ($1, 1, $2, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE
        SET count = rate_limits.count + 1, updated_at = NOW()
        RETURNING count;
        `,
        [windowKey, new Date(windowResetTime)]
      );

      const count = Number(result?.rows?.[0]?.count) || currentMemCount;
      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);

      return {
        allowed,
        algorithm: 'FIXED_WINDOW',
        limit,
        remaining,
        resetTimeMs: windowResetTime,
        retryAfterSec: allowed ? 0 : retryAfterSec,
      };
    } catch {
      // Memory fallback for multi-worker failover
      const allowed = currentMemCount <= limit;
      return {
        allowed,
        algorithm: 'FIXED_WINDOW',
        limit,
        remaining: Math.max(0, limit - currentMemCount),
        resetTimeMs: windowResetTime,
        retryAfterSec: allowed ? 0 : retryAfterSec,
      };
    }
  }

  /**
   * 2. SLIDING WINDOW ALGORITHM
   * Continuously evaluates requests within the rolling preceding windowMs.
   */
  public async checkSlidingWindow(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitCheckResult> {
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || Boolean(process.env.VITEST);

    // If Redis is active, try distributed sliding window first
    if (!isTest && getRedisStatus() === 'ok') {
      try {
        const rResult = await redisCheckSlidingWindow(key, limit, windowMs);
        if (rResult) {
          return {
            allowed: rResult.allowed,
            algorithm: 'SLIDING_WINDOW',
            limit,
            remaining: rResult.remaining,
            resetTimeMs: rResult.resetTimeMs,
            retryAfterSec: rResult.retryAfterSec,
          };
        }
      } catch {
        // Fallback to in-memory
      }
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.slidingWindows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.slidingWindows.set(key, entry);
    }

    // Filter out timestamps outside the rolling window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= limit) {
      // Oldest timestamp in window determines when slot frees up
      const oldestInWindow = entry.timestamps[0];
      const resetTimeMs = oldestInWindow + windowMs;
      const retryAfterSec = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

      return {
        allowed: false,
        algorithm: 'SLIDING_WINDOW',
        limit,
        remaining: 0,
        resetTimeMs,
        retryAfterSec,
      };
    }

    // Allowed: record timestamp
    entry.timestamps.push(now);
    const remaining = Math.max(0, limit - entry.timestamps.length);

    return {
      allowed: true,
      algorithm: 'SLIDING_WINDOW',
      limit,
      remaining,
      resetTimeMs: now + windowMs,
      retryAfterSec: 0,
    };
  }

  /**
   * 3. TOKEN BUCKET ALGORITHM
   * Capacity bucket with continuous token refill at refillRate tokens/sec.
   */
  public async checkTokenBucket(
    key: string,
    capacity: number,
    refillRate: number, // tokens per second
    cost = 1
  ): Promise<RateLimitCheckResult> {
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || Boolean(process.env.VITEST);

    // If Redis is active, try distributed token bucket first
    if (!isTest && getRedisStatus() === 'ok') {
      try {
        const rResult = await redisCheckTokenBucket(key, capacity, refillRate, cost);
        if (rResult) {
          return {
            allowed: rResult.allowed,
            algorithm: 'TOKEN_BUCKET',
            limit: capacity,
            remaining: rResult.remaining,
            resetTimeMs: rResult.resetTimeMs,
            retryAfterSec: rResult.retryAfterSec,
          };
        }
      } catch {
        // Fallback to in-memory
      }
    }

    const now = Date.now();

    let bucket = this.tokenBuckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefillTime: now,
      };
      this.tokenBuckets.set(key, bucket);
    } else {
      // Calculate token additions
      const elapsedSec = (now - bucket.lastRefillTime) / 1000;
      const tokensToAdd = elapsedSec * refillRate;
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefillTime = now;
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      const remaining = Math.floor(bucket.tokens);
      return {
        allowed: true,
        algorithm: 'TOKEN_BUCKET',
        limit: capacity,
        remaining,
        resetTimeMs: now + Math.ceil((capacity - bucket.tokens) / refillRate) * 1000,
        retryAfterSec: 0,
      };
    }

    // Not enough tokens
    const neededTokens = cost - bucket.tokens;
    const retryAfterSec = Math.max(1, Math.ceil(neededTokens / refillRate));
    return {
      allowed: false,
      algorithm: 'TOKEN_BUCKET',
      limit: capacity,
      remaining: 0,
      resetTimeMs: now + retryAfterSec * 1000,
      retryAfterSec,
    };
  }

  /**
   * 4. LEAKY BUCKET ALGORITHM
   * Traffic smoothing: bursts queue up in bucket and leak at constant leakRate (req/sec).
   */
  public checkLeakyBucket(
    key: string,
    capacity: number,
    leakRate: number // req / sec
  ): RateLimitCheckResult {
    const now = Date.now();

    let bucket = this.leakyBuckets.get(key);
    if (!bucket) {
      bucket = {
        waterLevel: 0,
        lastLeakTime: now,
      };
      this.leakyBuckets.set(key, bucket);
    } else {
      const elapsedSec = (now - bucket.lastLeakTime) / 1000;
      const leakedAmount = elapsedSec * leakRate;
      bucket.waterLevel = Math.max(0, bucket.waterLevel - leakedAmount);
      bucket.lastLeakTime = now;
    }

    // Check if adding 1 request overflows the bucket
    if (bucket.waterLevel + 1 <= capacity) {
      bucket.waterLevel += 1;
      const remaining = Math.max(0, Math.floor(capacity - bucket.waterLevel));
      return {
        allowed: true,
        algorithm: 'LEAKY_BUCKET',
        limit: capacity,
        remaining,
        resetTimeMs: now + Math.ceil(bucket.waterLevel / leakRate) * 1000,
        retryAfterSec: 0,
      };
    }

    // Bucket overflow (Burst rejected)
    const excess = bucket.waterLevel + 1 - capacity;
    const retryAfterSec = Math.max(1, Math.ceil(excess / leakRate));
    return {
      allowed: false,
      algorithm: 'LEAKY_BUCKET',
      limit: capacity,
      remaining: 0,
      resetTimeMs: now + retryAfterSec * 1000,
      retryAfterSec,
    };
  }

  // --------------------------------------------------------------------------
  // CENTRAL EVALUATION DISPATCHER
  // --------------------------------------------------------------------------
  public async evaluateRequest(
    policyId: string,
    identifier: string
  ): Promise<RateLimitCheckResult> {
    const policy = this.policies.get(policyId);
    if (!policy || !policy.enabled) {
      return {
        allowed: true,
        algorithm: 'SLIDING_WINDOW',
        limit: 9999,
        remaining: 9999,
        resetTimeMs: Date.now() + 60000,
        retryAfterSec: 0,
      };
    }

    this.totalRequests++;
    this.requestTimestamps.push(Date.now());

    const key = `${policy.id}:${identifier}`;
    let result: RateLimitCheckResult;

    switch (policy.algorithm) {
      case 'FIXED_WINDOW':
        result = await this.checkFixedWindow(key, policy.limit, policy.windowMs);
        break;
      case 'TOKEN_BUCKET':
        result = await this.checkTokenBucket(
          key,
          policy.capacity || policy.limit,
          policy.refillRate || 1,
          policy.costPerRequest || 1
        );
        break;
      case 'LEAKY_BUCKET':
        result = this.checkLeakyBucket(
          key,
          policy.capacity || policy.limit,
          policy.leakRate || 1
        );
        break;
      case 'SLIDING_WINDOW':
      default:
        result = await this.checkSlidingWindow(key, policy.limit, policy.windowMs);
        break;
    }

    if (result.allowed) {
      policy.totalAllowed++;
      this.totalAllowed++;
    } else {
      policy.totalBlocked++;
      this.totalBlocked++;
      policy.lastTriggered = new Date().toISOString();
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // SECURITY EVENT LOGGING & ABUSE DETECTION
  // --------------------------------------------------------------------------
  public recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      id: `sec_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    this.securityEvents.unshift(fullEvent);
    if (this.securityEvents.length > 200) {
      this.securityEvents.pop();
    }

    // Check abuse patterns & trigger Control Center Alert
    this.detectAbusePatterns(event.type, event.identifier, event.ip);
  }

  private detectAbusePatterns(type: string, identifier: string, ip: string): void {
    const recentIpEvents = this.securityEvents.filter(
      (e) => e.ip === ip && Date.now() - new Date(e.timestamp).getTime() < 5 * 60000
    );

    if (recentIpEvents.length >= 10) {
      controlCenter.triggerAlert({
        id: `abuse_ip_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`,
        level: 'CRITICAL',
        subsystem: 'API',
        title: 'Repeated Rate Limit Abuse Detected',
        message: `IP ${ip} has triggered ${recentIpEvents.length} rate limit blocks in 5 minutes. Inspect security logs.`,
      });
    }

    if (type === 'LOGIN_BRUTE_FORCE' || type === 'OTP_RATE_LIMITED') {
      controlCenter.triggerAlert({
        id: `abuse_auth_${identifier}`,
        level: 'WARNING',
        subsystem: 'AUTH',
        title: `${type === 'LOGIN_BRUTE_FORCE' ? 'Login Attack' : 'OTP Flooding'} Blocked`,
        message: `Account/Identifier [${identifier}] triggered defensive throttle to preserve credential security.`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // ADMIN CONTROL & POLICY MANAGEMENT
  // --------------------------------------------------------------------------
  public getPolicies(): RateLimitPolicy[] {
    return Array.from(this.policies.values());
  }

  public getPolicy(id: string): RateLimitPolicy | undefined {
    return this.policies.get(id);
  }

  public updatePolicy(
    id: string,
    updates: Partial<RateLimitPolicy>,
    isSuperAdmin = false
  ): { success: boolean; message: string } {
    const policy = this.policies.get(id);
    if (!policy) {
      return { success: false, message: `Policy ${id} not found` };
    }

    // Safety Rule: Critical security endpoints cannot be turned off by regular admins
    if (updates.enabled === false && policy.isCritical && !isSuperAdmin) {
      return {
        success: false,
        message: `Dangerous Operation: Disabling critical security policy [${policy.name}] requires Super Admin privileges.`,
      };
    }

    if (updates.algorithm) policy.algorithm = updates.algorithm;
    if (updates.limit && updates.limit > 0) policy.limit = updates.limit;
    if (updates.windowMs && updates.windowMs > 0) policy.windowMs = updates.windowMs;
    if (updates.capacity && updates.capacity > 0) policy.capacity = updates.capacity;
    if (updates.refillRate && updates.refillRate > 0) policy.refillRate = updates.refillRate;
    if (typeof updates.enabled === 'boolean') policy.enabled = updates.enabled;

    return { success: true, message: `Policy [${policy.name}] updated successfully` };
  }

  public getSecurityEvents(): SecurityEvent[] {
    return this.securityEvents;
  }

  public recordTraffic(path: string, method: string, statusCode: number, ip: string) {
    this.totalRequests++;
    this.requestTimestamps.push(Date.now());
    if (this.requestTimestamps.length > 2000) {
      this.requestTimestamps = this.requestTimestamps.slice(-1000);
    }

    if (statusCode === 429) {
      this.totalBlocked++;
    } else if (statusCode < 400) {
      this.totalAllowed++;
    }
  }

  public getSnapshot() {
    const oneSecAgo = Date.now() - 1000;
    const reqsPerSec = this.requestTimestamps.filter((t) => t > oneSecAgo).length;

    // Top Blocked Policies
    const topPolicies = Array.from(this.policies.values())
      .filter((p) => p.totalBlocked > 0)
      .sort((a, b) => b.totalBlocked - a.totalBlocked)
      .slice(0, 5);

    const redisStatus = getRedisStatus();
    const isDistributed = redisStatus === 'ok';

    return {
      totalRequests: this.totalRequests,
      totalAllowed: this.totalAllowed,
      totalBlocked: this.totalBlocked,
      requestsPerSecond: reqsPerSec,
      distributed: isDistributed,
      backend: isDistributed ? 'REDIS_DISTRIBUTED' : 'LOCAL_IN_MEMORY_FALLBACK',
      redisStatus: redisStatus === 'ok' ? 'ONLINE' : redisStatus === 'disabled' ? 'DISABLED' : 'DEGRADED',
      algorithms: ['FIXED_WINDOW', 'SLIDING_WINDOW', 'TOKEN_BUCKET', 'LEAKY_BUCKET'],
      policies: this.getPolicies(),
      topBlockedPolicies: topPolicies,
      recentEvents: this.securityEvents.slice(0, 30),
      timestamp: new Date().toISOString(),
    };
  }
}

export const rateLimitService = RateLimitService.getInstance();

/**
 * Universal Express Middleware Factory for Rate Limiting & Abuse Protection
 */
export function unxRateLimiter(policyId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const policy = rateLimitService.getPolicy(policyId);
    if (!policy || !policy.enabled) {
      return next();
    }

    // Extract multi-dimensional identifier:
    // 1. Authenticated User ID (primary if available)
    // 2. Account Email (for login/OTP/password reset bodies)
    // 3. Client IP (fallback and network perimeter)
    const ip =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const userId = (req as any).user?.id || (req as any).adminUser?.id;
    const emailBody = (req.body?.email || req.body?.identifier || '').toLowerCase().trim();

    // Determine identifier key
    let identifier = ip;
    if (userId) {
      identifier = `user:${userId}`;
    } else if (emailBody) {
      identifier = `account:${emailBody}`;
    }

    const check = await rateLimitService.evaluateRequest(policyId, identifier);

    // Standard Rate Limit Headers
    res.setHeader('X-RateLimit-Limit', check.limit);
    res.setHeader('X-RateLimit-Remaining', check.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(check.resetTimeMs / 1000));

    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSec);

      // Map event type
      let eventType: SecurityEvent['type'] = 'RATE_LIMITED';
      if (policyId.includes('LOGIN')) eventType = 'LOGIN_BRUTE_FORCE';
      else if (policyId.includes('OTP')) eventType = 'OTP_RATE_LIMITED';
      else if (policyId.includes('PASSWORD')) eventType = 'PASSWORD_RESET_RATE_LIMITED';
      else if (policyId.includes('2FA')) eventType = '2FA_RATE_LIMITED';
      else if (policyId.includes('ORDER')) eventType = 'ORDER_RATE_LIMITED';
      else if (policyId.includes('PAYMENT')) eventType = 'PAYMENT_RATE_LIMITED';
      else if (policyId.includes('WALLET')) eventType = 'WALLET_RATE_LIMITED';

      rateLimitService.recordSecurityEvent({
        type: eventType,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        identifier,
        ip,
        userId,
        requestId: (req as any).gatewayMeta?.requestId || (req as any).id || `unx_${Date.now()}`,
        retryAfterSec: check.retryAfterSec,
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Please wait ${check.retryAfterSec} second(s) and try again.`,
        },
        retryAfter: check.retryAfterSec,
        requestId: (req as any).gatewayMeta?.requestId || (req as any).id || undefined,
      });
    }

    next();
  };
}
