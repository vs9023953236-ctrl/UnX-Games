import { Request, Response, NextFunction } from 'express';
import { IdempotencyRecord } from './types.js';
import { sendGatewayError } from './response.js';

const idempotencyStore = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodic cleanup of expired keys
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 60000);

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to mutating requests with an Idempotency-Key header
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const key = (req.header('idempotency-key') || req.header('Idempotency-Key') || '').trim();
  if (!key) {
    // If not provided, proceed normally (endpoints that strictly require it will validate)
    return next();
  }

  const userId = (req as any).user?.id || (req as any).adminUser?.id || req.ip || 'anon';
  const compositeKey = `${userId}:${req.path}:${key}`;

  const existing = idempotencyStore.get(compositeKey);
  if (existing) {
    if (existing.expiresAt > Date.now()) {
      // Return cached response immediately
      res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
      return res.status(existing.statusCode).json(existing.responseBody);
    } else {
      idempotencyStore.delete(compositeKey);
    }
  }

  // Intercept the res.json method to capture the final response
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    // Only cache successful or intentional responses
    if (res.statusCode >= 200 && res.statusCode < 500) {
      idempotencyStore.set(compositeKey, {
        key,
        userId,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseBody: body,
        createdAt: Date.now(),
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
    }
    return originalJson(body);
  };

  next();
}

/**
 * Middleware for endpoints that strictly mandate an Idempotency-Key
 */
export function requireIdempotencyKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.header('idempotency-key') || req.header('Idempotency-Key') || '').trim();
  if (!key) {
    return sendGatewayError(
      req,
      res,
      'VALIDATION_ERROR',
      'Idempotency-Key header is required for this financial mutation to prevent duplicate processing.',
      400
    );
  }
  next();
}
