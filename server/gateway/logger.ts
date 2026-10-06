import { Request, Response, NextFunction } from 'express';
import { controlCenter } from './controlCenter.js';
import { rateLimitService } from './rateLimitEngine.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'pin',
  'security_pin',
  'token',
  'secret',
  'secret_key',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
]);

export function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function gatewayLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const reqId = req.gatewayMeta?.requestId || req.id || '-';
    const clientApp = req.gatewayMeta?.clientApp || 'unx-web';
    const status = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.url;

    // Only log API routes to keep console scannable
    if (path.startsWith('/api')) {
      // Record metrics into live Control Center
      controlCenter.recordRequest({
        requestId: reqId,
        method,
        path,
        statusCode: status,
        durationMs: duration,
        clientApp,
        ip: req.gatewayMeta?.ip || req.ip || req.socket.remoteAddress || '127.0.0.1',
        userId: (req as any).user?.id || (req as any).adminUser?.id || req.gatewayMeta?.userId,
        userRole: (req as any).user?.role || (req as any).adminUser?.role || req.gatewayMeta?.userRole,
        cacheLookup: res.getHeader('X-Cache-Lookup') as string | undefined,
      });

      // Record live rate limiter ledger & security telemetry
      rateLimitService.recordTraffic(
        path,
        method,
        status,
        req.gatewayMeta?.ip || req.ip || req.socket.remoteAddress || '127.0.0.1'
      );

      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';
      const logLine = `[UNX-GATEWAY] [${reqId}] ${method} ${path} -> ${status} (${duration}ms) [${clientApp}]`;

      if (level === 'error') {
        console.error(logLine);
      } else if (level === 'warn') {
        console.warn(logLine);
      } else {
        // Optional debug logging
      }
    }
  });

  next();
}
