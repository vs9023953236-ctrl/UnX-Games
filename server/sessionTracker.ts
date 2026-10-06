import { db } from '../src/db/index.js';
import { sessions, customers, users } from '../src/db/schema.js';
import { eq, and, gte, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { AuthRequest } from './auth.js';

export interface DeviceSessionDetails {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export function parseUserAgent(uaString?: string) {
  if (!uaString) {
    return {
      deviceType: 'Desktop',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
    };
  }

  const ua = uaString.toLowerCase();

  // Device type
  let deviceType = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    deviceType = ua.includes('tablet') || ua.includes('ipad') ? 'Tablet' : 'Mobile';
  }

  // OS
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
  else if (ua.includes('linux')) os = 'Linux';

  // Browser
  let browser = 'Web Browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';

  return { deviceType, browser, os };
}

/**
 * Tracks or updates a user device session in `public.sessions`.
 * This is used purely for security and device monitoring.
 */
export async function trackDeviceSession(req: AuthRequest, userId: string) {
  try {
    if (!userId) return null;

    const ipAddress = typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.ip || req.socket?.remoteAddress || '127.0.0.1');
    const userAgent = (req.headers['user-agent'] as string) || '';

    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Hash token or user+ip+ua combo to find session record
    const sessionTokenHash = crypto.createHash('sha256').update(`${userId}:${ipAddress}:${userAgent.slice(0, 100)}`).digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry for tracking

    // Use atomic upsert to avoid parallel insert race conditions
    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    await db.insert(sessions).values({
      id: sessionId,
      user_id: userId,
      session_token_hash: sessionTokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      browser,
      os,
      location_approx: 'Nepal',
      createdAt: now,
      expires_at: expiresAt,
      last_activity_at: now,
      revoked_at: null,
    }).onConflictDoUpdate({
      target: sessions.session_token_hash,
      set: {
        last_activity_at: now,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        browser,
        os,
        expires_at: expiresAt,
        revoked_at: null, // Reactivate session
      }
    });

    return sessionId;
  } catch (err) {
    console.warn('[SESSION_TRACKER] Failed to track device session:', err);
    return null;
  }
}
