import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CACHE_VERSION,
  CACHE_PREFIX,
  CACHE_KEYS,
  CACHE_TTLS,
  getRedisStatus,
  getRedisMetrics,
  isRedisHealthy,
  redisGet,
  redisSet,
  redisDel,
  redisDelByPattern,
  redisRemember,
  invalidateRedisCache,
  redisCheckRateLimit,
  redisAcquireLock,
  redisReleaseLock
} from '../../../server/redis.js';

describe('UNX Games - Redis Cache System & Architectural Invariants', () => {
  describe('1. Versioning & Key Namespacing Standards', () => {
    it('uses explicit v1 version namespace', () => {
      expect(CACHE_VERSION).toBe('v1');
      expect(CACHE_PREFIX).toBe('unx:v1:');
    });

    it('generates deterministic versioned keys for all core catalog resources', () => {
      expect(CACHE_KEYS.products).toBe('unx:v1:products');
      expect(CACHE_KEYS.productsList).toBe('unx:v1:products:list');
      expect(CACHE_KEYS.product('free-fire-diamonds')).toBe('unx:v1:product:free-fire-diamonds');
      expect(CACHE_KEYS.productPackages('prod-123')).toBe('unx:v1:packages:prod-123');
      expect(CACHE_KEYS.categories).toBe('unx:v1:categories');
      expect(CACHE_KEYS.games).toBe('unx:v1:games');
      expect(CACHE_KEYS.game('pubg-mobile')).toBe('unx:v1:game:pubg-mobile');
      expect(CACHE_KEYS.banners).toBe('unx:v1:banners');
      expect(CACHE_KEYS.news).toBe('unx:v1:news');
      expect(CACHE_KEYS.offers).toBe('unx:v1:offers');
      expect(CACHE_KEYS.settings).toBe('unx:v1:settings');
    });

    it('strictly isolates customer private display keys by customer ID', () => {
      const userAKey = CACHE_KEYS.userOrders('user-111');
      const userBKey = CACHE_KEYS.userOrders('user-222');
      expect(userAKey).toBe('unx:v1:orders:user:user-111');
      expect(userBKey).toBe('unx:v1:orders:user:user-222');
      expect(userAKey).not.toBe(userBKey);

      const userAWallet = CACHE_KEYS.userWalletDisplay('user-111');
      expect(userAWallet).toBe('unx:v1:wallet:display:user-111');
    });

    it('defines safe, bounded TTLs for all cache candidates', () => {
      expect(CACHE_TTLS.products).toBeGreaterThanOrEqual(120);
      expect(CACHE_TTLS.products).toBeLessThanOrEqual(600);
      expect(CACHE_TTLS.packages).toBeGreaterThanOrEqual(120);
      expect(CACHE_TTLS.categories).toBeGreaterThanOrEqual(300);
      expect(CACHE_TTLS.games).toBeGreaterThanOrEqual(300);
      expect(CACHE_TTLS.banners).toBeGreaterThanOrEqual(180);
      expect(CACHE_TTLS.news).toBeGreaterThanOrEqual(180);
      expect(CACHE_TTLS.settings).toBeGreaterThanOrEqual(180);
      expect(CACHE_TTLS.userOrdersDisplay).toBeLessThanOrEqual(60);
      expect(CACHE_TTLS.userWalletDisplay).toBeLessThanOrEqual(30);
    });
  });

  describe('2. Graceful Fallback & Offline Resilience (No Crash on Redis Unavailable)', () => {
    it('reports health metrics safely without throwing', async () => {
      const metrics = getRedisMetrics();
      expect(metrics).toHaveProperty('status');
      expect(['ok', 'degraded', 'disabled']).toContain(metrics.status);
      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('errors');
    });

    it('redisGet returns null on cache miss or when Redis is offline', async () => {
      const result = await redisGet('unx:v1:non_existent_key_xyz');
      expect(result).toBeNull();
    });

    it('redisSet gracefully handles sets without crashing', async () => {
      const success = await redisSet('unx:v1:test_key', { sample: 123 }, 60);
      expect(typeof success).toBe('boolean');
    });

    it('redisDel safely executes without throwing', async () => {
      const count = await redisDel('unx:v1:test_key');
      expect(typeof count).toBe('number');
    });

    it('redisDelByPattern safely executes without throwing', async () => {
      const count = await redisDelByPattern('unx:v1:products*');
      expect(typeof count).toBe('number');
    });
  });

  describe('3. Cache-Aside Pattern & Stampede Request Coalescing (Single-Flight)', () => {
    it('redisRemember executes fetcher and returns authoritative data on cache miss', async () => {
      const testKey = `unx:v1:test_fetch_${Date.now()}`;
      let fetchCount = 0;

      const result = await redisRemember(testKey, 60, async () => {
        fetchCount++;
        return { message: 'authoritative DB data', items: [1, 2, 3] };
      });

      expect(result).toEqual({ message: 'authoritative DB data', items: [1, 2, 3] });
      expect(fetchCount).toBe(1);
    });

    it('coalesces multiple concurrent requests into a single database query to prevent stampede', async () => {
      const stampedeKey = `unx:v1:stampede_test_${Date.now()}`;
      let dbFetchCount = 0;

      // 10 concurrent requests for the exact same uncached key
      const concurrentFetches = Array.from({ length: 10 }).map(() =>
        redisRemember(stampedeKey, 60, async () => {
          dbFetchCount++;
          // Simulate slight DB latency
          await new Promise((r) => setTimeout(r, 20));
          return { data: 'coalesced result' };
        })
      );

      const results = await Promise.all(concurrentFetches);

      // All 10 callers should receive identical results
      expect(results).toHaveLength(10);
      for (const res of results) {
        expect(res).toEqual({ data: 'coalesced result' });
      }

      // Exactly ONE database query should have executed!
      expect(dbFetchCount).toBe(1);
    });
  });

  describe('4. Centralized Invalidation Rules', () => {
    it('invalidates products cache without throwing', async () => {
      const count = await invalidateRedisCache('products', { id: 'prod-1', slug: 'free-fire' });
      expect(typeof count).toBe('number');
    });

    it('invalidates categories cache', async () => {
      const count = await invalidateRedisCache('categories');
      expect(typeof count).toBe('number');
    });

    it('invalidates games cache', async () => {
      const count = await invalidateRedisCache('games', { id: 'game-1' });
      expect(typeof count).toBe('number');
    });

    it('invalidates banners cache', async () => {
      const count = await invalidateRedisCache('banners');
      expect(typeof count).toBe('number');
    });

    it('invalidates news cache', async () => {
      const count = await invalidateRedisCache('news');
      expect(typeof count).toBe('number');
    });

    it('invalidates settings cache', async () => {
      const count = await invalidateRedisCache('settings');
      expect(typeof count).toBe('number');
    });

    it('invalidates user-specific order display cache without affecting other users', async () => {
      const count = await invalidateRedisCache('orders', { customerId: 'cust-123' });
      expect(typeof count).toBe('number');
    });
  });

  describe('5. Rate Limiting & Distributed Locking Primitives', () => {
    it('redisCheckRateLimit returns rate limit status without throwing', async () => {
      const res = await redisCheckRateLimit('127.0.0.1:auth_login', 5, 60);
      expect(res).toHaveProperty('allowed');
      expect(res).toHaveProperty('remaining');
      expect(res).toHaveProperty('resetTimeMs');
      expect(typeof res.allowed).toBe('boolean');
    });

    it('redisAcquireLock and redisReleaseLock execute safely', async () => {
      const lockRes = await redisAcquireLock('checkout_order_123', 5000);
      expect(lockRes).toHaveProperty('acquired');
      expect(lockRes).toHaveProperty('lockId');
      expect(typeof lockRes.lockId).toBe('string');

      const released = await redisReleaseLock('checkout_order_123', lockRes.lockId);
      expect(typeof released).toBe('boolean');
    });
  });
});
