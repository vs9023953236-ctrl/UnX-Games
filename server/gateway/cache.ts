import { Request, Response, NextFunction } from 'express';
import { cacheService, AdvancedCacheService } from './cacheService.js';

export * from './cacheService.js';

/**
 * Backward-compatible helper to retrieve a cached entry
 */
export function getCachedResponse<T = any>(key: string): T | null {
  const result = cacheService.get<T>(key);
  return result ? result.data : null;
}

/**
 * Backward-compatible helper to store an entry
 */
export function setCachedResponse<T = any>(
  key: string,
  data: T,
  ttlSeconds: number = cacheService.config.defaultTtl,
  tags: string[] = []
): boolean {
  return cacheService.set(key, data, ttlSeconds, tags);
}

/**
 * Backward-compatible tag invalidator
 */
export function invalidateCacheTag(tag: string): number {
  return cacheService.invalidateTag(tag);
}

/**
 * Backward-compatible full flush
 */
export function invalidateAllCache(): void {
  cacheService.clear();
}

/**
 * Advanced Gateway Cache-Aside Middleware with ETag, SWR & Stampede Protection
 */
export function gatewayCache(
  ttlSeconds: number,
  tags: string[] = [],
  options: { allowStale?: boolean; privateUser?: boolean } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache safe GET requests
    if (req.method !== 'GET') return next();

    // Private user routes require user authentication
    let cacheKey = '';
    if (options.privateUser) {
      const userId = (req as any).user?.id || (req as any).adminUser?.id;
      if (!userId) return next(); // Do not cache unauthenticated private routes
      cacheKey = `unx:v1:user:${userId}:${req.path.replace(/\//g, ':')}`;
    } else {
      cacheKey = `unx:v1:route:${req.originalUrl || req.url}`;
    }

    // Check cache
    const cached = cacheService.get(cacheKey);

    if (cached) {
      // 1. ETag & Conditional 304 Validation
      const clientEtag = req.header('if-none-match') || req.header('If-None-Match');
      if (clientEtag && cached.etag && clientEtag === cached.etag) {
        res.setHeader('X-Cache-Lookup', '304_HIT');
        res.setHeader('ETag', cached.etag);
        return res.status(304).end();
      }

      // 2. Cache Hit Response
      res.setHeader('X-Cache-Lookup', cached.isStale ? 'STALE_HIT' : 'HIT');
      res.setHeader('ETag', cached.etag);
      res.setHeader(
        'Cache-Control',
        options.privateUser ? 'private, no-cache' : `public, max-age=${Math.min(ttlSeconds, 300)}`
      );

      return res.status(200).json(cached.data);
    }

    // 3. Cache Miss: Intercept response to store fresh authoritative DB data
    res.setHeader('X-Cache-Lookup', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Cache only clean successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
        cacheService.set(cacheKey, body, ttlSeconds, tags);
      }
      return originalJson(body);
    };

    next();
  };
}
