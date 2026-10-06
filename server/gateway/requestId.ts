import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ClientAppType, GatewayRequestMetadata } from './types.js';

declare global {
  namespace Express {
    interface Request {
      gatewayMeta?: GatewayRequestMetadata;
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  let reqId = req.header('x-request-id') || req.header('X-Request-ID') || '';

  // Validate or generate request ID (safe UUID/hex format)
  if (!reqId || typeof reqId !== 'string' || !/^[a-zA-Z0-9\-_]{8,64}$/.test(reqId)) {
    reqId = `unx_${crypto.randomUUID()}`;
  }

  // Determine client app type
  const rawClient = (req.header('x-client-app') || req.header('X-Client-App') || '').toLowerCase().trim();
  let clientApp: ClientAppType = 'unx-web';
  const reqPath = req.path || req.url || '';
  if (rawClient === 'unx-admin' || reqPath.includes('/admin')) {
    clientApp = 'unx-admin';
  } else if (rawClient === 'unx-user' || rawClient === 'unx-mobile') {
    clientApp = rawClient as ClientAppType;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const userAgent = req.headers['user-agent'] || 'unknown';
  const idempotencyKey = (req.header('idempotency-key') || req.header('Idempotency-Key') || '').trim();

  const meta: GatewayRequestMetadata = {
    requestId: reqId,
    clientApp,
    startTime,
    ip,
    userAgent,
    idempotencyKey: idempotencyKey || undefined,
  };

  req.gatewayMeta = meta;
  req.id = reqId;

  res.setHeader('X-Request-ID', reqId);
  res.setHeader('X-Client-App', clientApp);

  next();
}
