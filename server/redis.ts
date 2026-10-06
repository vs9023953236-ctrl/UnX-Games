/**
 * UNX Games / Game Hub Nepal - Authoritative Server-Side Redis Cache Layer
 * 
 * Architectural Mandates:
 * 1. Redis is ONLY a CACHE / PERFORMANCE / RATE-LIMITING / LOCKING layer.
 * 2. Supabase PostgreSQL remains the SINGLE SOURCE OF TRUTH.
 * 3. Cloudflare R2 remains the ONLY persistent application file/media storage.
 * 4. Authoritative financial data (wallets, payments, orders, KYC, refunds) MUST NOT be stored only in Redis.
 * 5. Redis connection is lazy, server-only, error-safe, and gracefully degraded when offline.
 * 6. Never expose Redis credentials to the frontend or in logs.
 */

import { Redis, RedisOptions } from 'ioredis';

// -----------------------------------------------------------------------------
// CACHE KEY & TTL STANDARDS (Versioned unx:v1:*)
// -----------------------------------------------------------------------------
export const CACHE_VERSION = 'v1';
export const CACHE_PREFIX = `unx:${CACHE_VERSION}:`;

export const CACHE_KEYS = {
  // Public Catalog & App Data
  products: `${CACHE_PREFIX}products`,
  productsList: `${CACHE_PREFIX}products:list`,
  product: (idOrSlug: string) => `${CACHE_PREFIX}product:${idOrSlug}`,
  productPackages: (productId: string) => `${CACHE_PREFIX}packages:${productId}`,
  categories: `${CACHE_PREFIX}categories`,
  games: `${CACHE_PREFIX}games`,
  game: (idOrSlug: string) => `${CACHE_PREFIX}game:${idOrSlug}`,
  banners: `${CACHE_PREFIX}banners`,
  news: `${CACHE_PREFIX}news`,
  offers: `${CACHE_PREFIX}offers`,
  settings: `${CACHE_PREFIX}settings`,
  paymentSettings: `${CACHE_PREFIX}payment_settings`,
  couponsMetadata: `${CACHE_PREFIX}coupons:meta`,

  // Customer isolated display cache (short-lived, non-authoritative)
  userOrders: (customerId: string) => `${CACHE_PREFIX}orders:user:${customerId}`,
  userWalletDisplay: (customerId: string) => `${CACHE_PREFIX}wallet:display:${customerId}`,

  // Rate Limiting & Distributed Locks
  rateLimit: (key: string) => `${CACHE_PREFIX}rl:${key}`,
  lock: (resource: string) => `${CACHE_PREFIX}lock:${resource}`,
} as const;

export const CACHE_TTLS = {
  products: 300,        // 5 minutes (catalog)
  packages: 300,        // 5 minutes
  categories: 600,      // 10 minutes
  games: 600,           // 10 minutes
  banners: 300,         // 5 minutes
  news: 300,            // 5 minutes
  offers: 300,          // 5 minutes
  settings: 300,        // 5 minutes
  couponsMeta: 180,     // 3 minutes
  userOrdersDisplay: 30, // 30 seconds (isolated display cache)
  userWalletDisplay: 15, // 15 seconds (strictly display cache)
  lockDefaultMs: 10000,  // 10 seconds lock timeout
} as const;

// -----------------------------------------------------------------------------
// METRICS & TELEMETRY
// -----------------------------------------------------------------------------
export interface RedisCacheMetrics {
  status: 'ok' | 'degraded' | 'disabled';
  connected: boolean;
  tlsEnabled: boolean;
  hits: number;
  misses: number;
  hitRate: number;
  errors: number;
  setOperations: number;
  getOperations: number;
  delOperations: number;
  lastError: string | null;
  lastConnectedAt: string | null;
  latencyMs: number;
}

const metrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  setOps: 0,
  getOps: 0,
  delOps: 0,
  lastError: null as string | null,
  lastConnectedAt: null as string | null,
  latencyMs: 0,
};

// -----------------------------------------------------------------------------
// SINGLE-FLIGHT / REQUEST COALESCING (Stampede Protection)
// -----------------------------------------------------------------------------
const inFlightPromises = new Map<string, Promise<any>>();

// -----------------------------------------------------------------------------
// REDIS CLIENT SINGLETON
// -----------------------------------------------------------------------------
let redisClient: Redis | null = null;
let isInitializing = false;
let isDegraded = false;

/**
 * Safely parse and sanitize Redis configuration from environment variables.
 * Never logs or exposes credentials.
 */
function getRedisConfig(): { enabled: boolean; options?: RedisOptions; url?: string; isTls: boolean } {
  // If explicitly disabled via env
  if (process.env.REDIS_ENABLED === 'false') {
    return { enabled: false, isTls: false };
  }

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    // No Redis configuration present
    return { enabled: false, isTls: false };
  }

  const isTls = 
    Boolean(redisUrl?.startsWith('rediss://')) ||
    process.env.REDIS_TLS === 'true' ||
    process.env.REDIS_TLS === '1';

  const commonOptions: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 1, // Fail fast so DB fallback takes over immediately
    connectTimeout: 4000,
    commandTimeout: 2500,
    enableOfflineQueue: false, // Don't queue when disconnected; fallback directly to PostgreSQL
    retryStrategy: (times) => {
      // Exponential backoff capped at 5 seconds
      if (times > 8) {
        isDegraded = true;
        return null; // Stop retrying continuously if permanently unreachable
      }
      return Math.min(times * 300, 3000);
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      return targetErrors.some(e => err.message.includes(e));
    },
  };

  if (isTls) {
    commonOptions.tls = {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  if (redisUrl) {
    return {
      enabled: true,
      url: redisUrl,
      options: commonOptions,
      isTls,
    };
  }

  // Host/Port configuration
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const username = process.env.REDIS_USERNAME || undefined;
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    enabled: true,
    options: {
      ...commonOptions,
      host: redisHost,
      port,
      username,
      password,
    },
    isTls,
  };
}

/**
 * Initializes the Redis client singleton if configured.
 * Lazy and non-blocking.
 */
export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  if (isInitializing) return null;

  const cfg = getRedisConfig();
  if (!cfg.enabled) {
    return null;
  }

  isInitializing = true;
  try {
    if (cfg.url) {
      redisClient = new Redis(cfg.url, cfg.options);
    } else if (cfg.options) {
      redisClient = new Redis(cfg.options);
    }

    if (redisClient) {
      redisClient.on('connect', () => {
        isDegraded = false;
        metrics.lastConnectedAt = new Date().toISOString();
        console.log('[Redis] Connected to cache service successfully');
      });

      redisClient.on('ready', () => {
        isDegraded = false;
      });

      redisClient.on('error', (err: any) => {
        isDegraded = true;
        metrics.errors++;
        metrics.lastError = err?.message || 'Redis connection error';
        // Safe logging: Never log password or URL with credentials
        console.warn('[Redis] Cache notice (falling back to database):', err?.message || 'Connection error');
      });

      redisClient.on('close', () => {
        isDegraded = true;
      });

      // Eagerly attempt connection in background without blocking startup
      redisClient.connect().catch((err: any) => {
        isDegraded = true;
        metrics.errors++;
        metrics.lastError = err?.message || 'Redis initial connection failed';
        console.warn('[Redis] Initial connection unavailable, operating in database-fallback mode.');
      });
    }
  } catch (err: any) {
    isDegraded = true;
    metrics.errors++;
    metrics.lastError = err?.message || 'Failed to instantiate Redis client';
    console.warn('[Redis] Failed to initialize client, operating in database-fallback mode.');
  } finally {
    isInitializing = false;
  }

  return redisClient;
}

// Initialize on module load if configured
getRedisClient();

// -----------------------------------------------------------------------------
// HEALTH & STATUS CHECK
// -----------------------------------------------------------------------------
export async function isRedisHealthy(): Promise<boolean> {
  const client = getRedisClient();
  if (!client || isDegraded) return false;

  try {
    const start = Date.now();
    const pong = await client.ping();
    metrics.latencyMs = Date.now() - start;
    return pong === 'PONG';
  } catch {
    isDegraded = true;
    return false;
  }
}

export function getRedisStatus(): 'ok' | 'degraded' | 'disabled' {
  const cfg = getRedisConfig();
  if (!cfg.enabled) return 'disabled';
  if (isDegraded || !redisClient) return 'degraded';
  return 'ok';
}

export function getRedisMetrics(): RedisCacheMetrics {
  const cfg = getRedisConfig();
  const totalOps = metrics.hits + metrics.misses;
  const hitRate = totalOps > 0 ? Number(((metrics.hits / totalOps) * 100).toFixed(2)) : 0;

  return {
    status: getRedisStatus(),
    connected: !isDegraded && redisClient !== null && redisClient.status === 'ready',
    tlsEnabled: cfg.isTls,
    hits: metrics.hits,
    misses: metrics.misses,
    hitRate,
    errors: metrics.errors,
    setOperations: metrics.setOps,
    getOperations: metrics.getOps,
    delOperations: metrics.delOps,
    lastError: metrics.lastError,
    lastConnectedAt: metrics.lastConnectedAt,
    latencyMs: metrics.latencyMs,
  };
}

// -----------------------------------------------------------------------------
// CORE CACHE PRIMITIVES (Safe & Fallback-Ready)
// -----------------------------------------------------------------------------

/**
 * Get an item from Redis cache. Returns null on miss or error.
 */
export async function redisGet<T = any>(key: string): Promise<T | null> {
  metrics.getOps++;
  const client = getRedisClient();
  if (!client || isDegraded) {
    metrics.misses++;
    return null;
  }

  try {
    const raw = await client.get(key);
    if (!raw) {
      metrics.misses++;
      return null;
    }
    metrics.hits++;
    return JSON.parse(raw) as T;
  } catch (err: any) {
    metrics.errors++;
    metrics.misses++;
    // Safe error: return null so caller falls back to database
    return null;
  }
}

/**
 * Set an item in Redis cache with explicit TTL.
 * Guaranteed to enforce TTL (compatible with volatile-lru eviction policy).
 */
export async function redisSet<T = any>(
  key: string,
  value: T,
  ttlSeconds: number = CACHE_TTLS.products
): Promise<boolean> {
  metrics.setOps++;
  const client = getRedisClient();
  if (!client || isDegraded || value === undefined || value === null) {
    return false;
  }

  try {
    const safeTtl = Math.max(1, Math.floor(ttlSeconds));
    const payload = JSON.stringify(value);
    await client.set(key, payload, 'EX', safeTtl);
    return true;
  } catch (err: any) {
    metrics.errors++;
    return false;
  }
}

/**
 * Delete one or more specific keys from Redis.
 */
export async function redisDel(...keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  metrics.delOps++;
  const client = getRedisClient();
  if (!client || isDegraded) return 0;

  try {
    return await client.del(...keys);
  } catch {
    metrics.errors++;
    return 0;
  }
}

/**
 * Safely delete keys matching a pattern using non-blocking SCAN.
 * NEVER uses blocking `KEYS *`.
 */
export async function redisDelByPattern(pattern: string): Promise<number> {
  metrics.delOps++;
  const client = getRedisClient();
  if (!client || isDegraded) return 0;

  let cursor = '0';
  let totalDeleted = 0;

  try {
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        const deleted = await client.del(...keys);
        totalDeleted += deleted;
      }
    } while (cursor !== '0');
    return totalDeleted;
  } catch {
    metrics.errors++;
    return totalDeleted;
  }
}

/**
 * High-Level Cache-Aside Pattern with Request Coalescing (Cache Stampede Protection):
 * 1. Checks Redis cache.
 * 2. On HIT, returns cached value.
 * 3. On MISS, collapses concurrent callers into ONE database query (single-flight).
 * 4. Stores result in Redis with TTL.
 * 5. Returns authoritative database result.
 * 
 * Never caches empty/error responses indefinitely.
 */
export async function redisRemember<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. Try Cache Read
  const cached = await redisGet<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  // 2. Cache Stampede Protection (Single-Flight In-Flight Request Deduplication)
  if (inFlightPromises.has(key)) {
    return inFlightPromises.get(key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      if (result !== null && result !== undefined) {
        // Asynchronously save to Redis without blocking returning the result
        redisSet(key, result, ttlSeconds).catch(() => {});
      }
      return result;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

// -----------------------------------------------------------------------------
// CACHE INVALIDATION RULES
// -----------------------------------------------------------------------------
export type CacheEntity = 
  | 'products' 
  | 'categories' 
  | 'games' 
  | 'banners' 
  | 'news' 
  | 'offers' 
  | 'settings' 
  | 'orders' 
  | 'all';

/**
 * Canonical Cache Invalidation for Admin Mutations:
 * Invalidates relevant keys and patterns when data changes in Supabase PostgreSQL.
 */
export async function invalidateRedisCache(
  entity: CacheEntity,
  options?: { id?: string; slug?: string; customerId?: string }
): Promise<number> {
  let count = 0;

  switch (entity) {
    case 'products':
      // Invalidate products list, general list, and specific product/packages
      count += await redisDel(CACHE_KEYS.products, CACHE_KEYS.productsList);
      if (options?.id) {
        count += await redisDel(
          CACHE_KEYS.product(options.id),
          CACHE_KEYS.productPackages(options.id)
        );
      }
      if (options?.slug) {
        count += await redisDel(CACHE_KEYS.product(options.slug));
      }
      count += await redisDelByPattern(`${CACHE_PREFIX}products*`);
      count += await redisDelByPattern(`${CACHE_PREFIX}packages*`);
      break;

    case 'categories':
      count += await redisDel(CACHE_KEYS.categories);
      count += await redisDelByPattern(`${CACHE_PREFIX}categories*`);
      break;

    case 'games':
      count += await redisDel(CACHE_KEYS.games);
      if (options?.id) count += await redisDel(CACHE_KEYS.game(options.id));
      if (options?.slug) count += await redisDel(CACHE_KEYS.game(options.slug));
      count += await redisDelByPattern(`${CACHE_PREFIX}games*`);
      break;

    case 'banners':
      count += await redisDel(CACHE_KEYS.banners);
      count += await redisDelByPattern(`${CACHE_PREFIX}banners*`);
      break;

    case 'news':
      count += await redisDel(CACHE_KEYS.news);
      count += await redisDelByPattern(`${CACHE_PREFIX}news*`);
      break;

    case 'offers':
      count += await redisDel(CACHE_KEYS.offers);
      count += await redisDelByPattern(`${CACHE_PREFIX}offers*`);
      break;

    case 'settings':
      count += await redisDel(CACHE_KEYS.settings, CACHE_KEYS.paymentSettings);
      count += await redisDelByPattern(`${CACHE_PREFIX}settings*`);
      break;

    case 'orders':
      if (options?.customerId) {
        count += await redisDel(CACHE_KEYS.userOrders(options.customerId));
      } else {
        count += await redisDelByPattern(`${CACHE_PREFIX}orders:*`);
      }
      break;

    case 'all':
      count += await redisDelByPattern(`${CACHE_PREFIX}*`);
      break;
  }

  return count;
}

// -----------------------------------------------------------------------------
// RATE LIMITING VIA REDIS (Atomic Token/Counter & Sliding Window Patterns)
// -----------------------------------------------------------------------------
/**
 * Redis-based Atomic Fixed-Window Rate Limiter with In-Memory Failover:
 * Returns whether the request is allowed and the remaining quota.
 */
export async function redisCheckRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number; resetTimeMs: number; retryAfterSec: number }> {
  const rateLimitKey = CACHE_KEYS.rateLimit(key);
  const client = getRedisClient();

  // If Redis is unavailable, return allowed: true so fallback/in-memory engine handles it
  if (!client || isDegraded) {
    return {
      allowed: true,
      remaining: limit,
      resetTimeMs: Date.now() + windowSec * 1000,
      retryAfterSec: 0,
    };
  }

  try {
    const pipeline = client.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.ttl(rateLimitKey);
    const results = await pipeline.exec();

    if (!results || results.length < 2) {
      return { allowed: true, remaining: limit, resetTimeMs: Date.now() + windowSec * 1000, retryAfterSec: 0 };
    }

    const [incrErr, countRes] = results[0];
    const [ttlErr, ttlRes] = results[1];

    if (incrErr) {
      return { allowed: true, remaining: limit, resetTimeMs: Date.now() + windowSec * 1000, retryAfterSec: 0 };
    }

    const count = Number(countRes) || 1;
    let ttl = Number(ttlRes);

    // If key has no expiration set yet (new key), set the TTL
    if (ttl === -1 || ttl === -2) {
      await client.expire(rateLimitKey, windowSec);
      ttl = windowSec;
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const retryAfterSec = allowed ? 0 : Math.max(1, ttl);
    const resetTimeMs = Date.now() + retryAfterSec * 1000;

    return {
      allowed,
      remaining,
      resetTimeMs,
      retryAfterSec,
    };
  } catch {
    metrics.errors++;
    return {
      allowed: true,
      remaining: limit,
      resetTimeMs: Date.now() + windowSec * 1000,
      retryAfterSec: 0,
    };
  }
}

/**
 * Redis-based Sliding Window Rate Limiter using atomic ZSET:
 */
export async function redisCheckSlidingWindow(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTimeMs: number; retryAfterSec: number } | null> {
  const client = getRedisClient();
  if (!client || isDegraded) return null;

  const now = Date.now();
  const clearBefore = now - windowMs;
  const zsetKey = `${CACHE_PREFIX}rl:sw:${key}`;
  const member = `${now}:${Math.random().toString(36).slice(2, 7)}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(zsetKey, '-inf', clearBefore);
    pipeline.zcard(zsetKey);
    pipeline.zadd(zsetKey, now, member);
    pipeline.expire(zsetKey, windowSec + 2);
    const results = await pipeline.exec();

    if (!results || results.length < 3) return null;
    const currentCount = Number(results[1][1]) || 0;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - (currentCount + 1));
    const retryAfterSec = allowed ? 0 : Math.max(1, Math.ceil(windowMs / 1000));

    if (!allowed) {
      // Remove member that was added past the limit
      await client.zrem(zsetKey, member).catch(() => {});
    }

    return {
      allowed,
      remaining,
      resetTimeMs: now + windowMs,
      retryAfterSec,
    };
  } catch {
    metrics.errors++;
    return null;
  }
}

/**
 * Redis-based Token Bucket Rate Limiter using Lua script for atomicity:
 */
export async function redisCheckTokenBucket(
  key: string,
  capacity: number,
  refillRate: number,
  cost = 1
): Promise<{ allowed: boolean; remaining: number; resetTimeMs: number; retryAfterSec: number } | null> {
  const client = getRedisClient();
  if (!client || isDegraded) return null;

  const tbKey = `${CACHE_PREFIX}rl:tb:${key}`;
  const now = Date.now();

  const lua = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local cost = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])
    
    local data = redis.call("HMGET", key, "tokens", "last_refill")
    local tokens = tonumber(data[1])
    local last_refill = tonumber(data[2])
    
    if not tokens then
      tokens = capacity
      last_refill = now
    else
      local elapsed = (now - last_refill) / 1000
      tokens = math.min(capacity, tokens + (elapsed * refillRate))
      last_refill = now
    end
    
    local allowed = 0
    local remaining = 0
    local retryAfter = 0
    
    if tokens >= cost then
      tokens = tokens - cost
      allowed = 1
      remaining = math.floor(tokens)
    else
      allowed = 0
      remaining = 0
      local needed = cost - tokens
      retryAfter = math.ceil(needed / refillRate)
    end
    
    redis.call("HMSET", key, "tokens", tokens, "last_refill", last_refill)
    redis.call("EXPIRE", key, math.max(60, math.ceil(capacity / refillRate) * 2))
    
    return { allowed, remaining, retryAfter }
  `;

  try {
    const result: any = await client.eval(lua, 1, tbKey, capacity, refillRate, cost, now);
    if (!result || !Array.isArray(result)) return null;

    const allowed = Number(result[0]) === 1;
    const remaining = Number(result[1]);
    const retryAfterSec = allowed ? 0 : Math.max(1, Number(result[2]));

    return {
      allowed,
      remaining,
      resetTimeMs: now + (retryAfterSec * 1000),
      retryAfterSec,
    };
  } catch {
    metrics.errors++;
    return null;
  }
}

// -----------------------------------------------------------------------------
// SHORT-LIVED DISTRIBUTED LOCKS (Non-authoritative helper)
// -----------------------------------------------------------------------------
/**
 * Acquire a distributed lock.
 * NEVER replaces PostgreSQL transactions for financial correctness.
 */
export async function redisAcquireLock(
  resource: string,
  ttlMs: number = CACHE_TTLS.lockDefaultMs
): Promise<{ acquired: boolean; lockId: string }> {
  const lockKey = CACHE_KEYS.lock(resource);
  const lockId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const client = getRedisClient();

  if (!client || isDegraded) {
    // If Redis is down, return acquired: true so DB locks handle concurrency
    return { acquired: true, lockId };
  }

  try {
    const result = await client.set(lockKey, lockId, 'PX', ttlMs, 'NX');
    return {
      acquired: result === 'OK',
      lockId,
    };
  } catch {
    metrics.errors++;
    return { acquired: true, lockId };
  }
}

/**
 * Safe release of distributed lock using Lua script to guarantee only lock owner releases.
 */
export async function redisReleaseLock(resource: string, lockId: string): Promise<boolean> {
  const lockKey = CACHE_KEYS.lock(resource);
  const client = getRedisClient();

  if (!client || isDegraded) return true;

  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    const result = await client.eval(luaScript, 1, lockKey, lockId);
    return result === 1;
  } catch {
    metrics.errors++;
    return false;
  }
}
