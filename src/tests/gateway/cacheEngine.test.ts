import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdvancedCacheService, cacheService } from '../../../server/gateway/cacheService.js';

describe('UNX Advanced Cache Engine (Video-Aligned Architecture)', () => {
  beforeEach(() => {
    cacheService.clear(true);
    vi.clearAllMocks();
  });

  describe('1. Cache-Aside Pattern: Hit & Miss Flow', () => {
    it('executes database fetch on Cache Miss and populates cache', async () => {
      const dbFetcher = vi.fn().mockResolvedValue([{ id: 'g1', name: 'Free Fire' }]);
      const key = AdvancedCacheService.keys.gamesList();

      // 1. Initial request: Cache MISS -> Database fetch
      const missResult = await cacheService.getOrFetch(key, dbFetcher, { ttlSeconds: 60 });
      expect(missResult.source).toBe('DB_MISS');
      expect(missResult.data).toEqual([{ id: 'g1', name: 'Free Fire' }]);
      expect(dbFetcher).toHaveBeenCalledTimes(1);

      // 2. Second request: Cache HIT -> returns cached data without calling database
      const hitResult = await cacheService.getOrFetch(key, dbFetcher, { ttlSeconds: 60 });
      expect(hitResult.source).toBe('CACHE_HIT');
      expect(hitResult.data).toEqual([{ id: 'g1', name: 'Free Fire' }]);
      expect(dbFetcher).toHaveBeenCalledTimes(1); // Still only 1 DB call!
    });
  });

  describe('2. TTL (Time-To-Live) Lifecycle & Expiration', () => {
    it('returns valid cached data before TTL and triggers fresh fetch after TTL', async () => {
      const key = AdvancedCacheService.keys.productDetail('p1');
      cacheService.set(key, { id: 'p1', price: 100 }, 1, ['products'], 0); // 1s TTL, 0s grace

      // Valid immediately
      const firstGet = cacheService.get(key);
      expect(firstGet).not.toBeNull();
      expect(firstGet?.data).toEqual({ id: 'p1', price: 100 });

      // Fast-forward or simulate expiration by adjusting store entry expiresAt
      const entry = (cacheService as any).store.get(key);
      entry.expiresAt = Date.now() - 1000;

      // After expiration -> returns null (cache miss)
      const expiredGet = cacheService.get(key);
      expect(expiredGet).toBeNull();
    });
  });

  describe('3. LFU (Least Frequently Used) Eviction Strategy', () => {
    it('evicts the least frequently accessed entry when capacity is reached', () => {
      // Temporarily set maxItems to 3 for testing
      const originalMax = (cacheService as any).config.maxItems;
      (cacheService as any).config.maxItems = 3;

      try {
        cacheService.set('item-A', 'data-A', 60);
        cacheService.set('item-B', 'data-B', 60);
        cacheService.set('item-C', 'data-C', 60);

        // Access item-A 3 times, item-B 2 times, item-C 0 times
        cacheService.get('item-A');
        cacheService.get('item-A');
        cacheService.get('item-A');

        cacheService.get('item-B');
        cacheService.get('item-B');

        // Now insert 4th item -> must evict item-C (lowest frequency)
        cacheService.set('item-D', 'data-D', 60);

        expect(cacheService.has('item-A')).toBe(true);
        expect(cacheService.has('item-B')).toBe(true);
        expect(cacheService.has('item-D')).toBe(true);
        expect(cacheService.has('item-C')).toBe(false); // Evicted!
      } finally {
        (cacheService as any).config.maxItems = originalMax;
      }
    });
  });

  describe('4. LRU Tie-Breaker for Equal Frequencies', () => {
    it('evicts least recently used entry when entries share the same frequency', () => {
      const originalMax = (cacheService as any).config.maxItems;
      (cacheService as any).config.maxItems = 2;

      try {
        cacheService.set('item-1', 'val-1', 60);
        cacheService.set('item-2', 'val-2', 60);

        // Artificially make item-1 accessed earlier than item-2
        const entry1 = (cacheService as any).store.get('item-1');
        const entry2 = (cacheService as any).store.get('item-2');
        entry1.lastAccessedAt = 1000;
        entry2.lastAccessedAt = 2000;

        // Both have frequency 1. Inserting item-3 must evict item-1 (older access)
        cacheService.set('item-3', 'val-3', 60);

        expect(cacheService.has('item-2')).toBe(true);
        expect(cacheService.has('item-3')).toBe(true);
        expect(cacheService.has('item-1')).toBe(false); // Evicted by LRU tie-breaker!
      } finally {
        (cacheService as any).config.maxItems = originalMax;
      }
    });
  });

  describe('5. Cache Stampede Protection (In-Flight Request Coalescing)', () => {
    it('coalesces 50 concurrent requests into a single database execution', async () => {
      let dbExecutions = 0;
      const slowDbFetcher = vi.fn().mockImplementation(async () => {
        dbExecutions++;
        await new Promise((r) => setTimeout(r, 50)); // simulate 50ms DB query
        return { catalog: 'top-up-diamonds-pack' };
      });

      const key = AdvancedCacheService.keys.packages('free-fire');

      // Fire 50 simultaneous requests
      const promises = Array.from({ length: 50 }).map(() =>
        cacheService.getOrFetch(key, slowDbFetcher, { ttlSeconds: 60 })
      );

      const results = await Promise.all(promises);

      // All 50 received the correct data
      expect(results).toHaveLength(50);
      results.forEach((res) => {
        expect(res.data).toEqual({ catalog: 'top-up-diamonds-pack' });
      });

      // Crucial: DB was called exactly ONCE!
      expect(dbExecutions).toBe(1);
      expect(slowDbFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Centralized Cache Invalidation Map', () => {
    it('invalidates related product and package keys when a product mutation occurs', async () => {
      const prodKey = AdvancedCacheService.keys.productsList();
      const detailKey = AdvancedCacheService.keys.productDetail('p100');

      cacheService.set(prodKey, [{ id: 'p100' }], 60, ['products']);
      cacheService.set(detailKey, { id: 'p100', price: 50 }, 60, ['products']);

      expect(cacheService.has(prodKey)).toBe(true);
      expect(cacheService.has(detailKey)).toBe(true);

      // Admin updates product
      await cacheService.onEntityMutated('product', 'p100');

      // Both keys must be purged
      expect(cacheService.has(prodKey)).toBe(false);
      expect(cacheService.has(detailKey)).toBe(false);
    });
  });

  describe('7. Cache Failure & Graceful Database Fallback', () => {
    it('seamlessly falls back to database when cache is disabled or encounters an issue', async () => {
      cacheService.config.enabled = false;
      const dbFetcher = vi.fn().mockResolvedValue({ status: 'db-direct' });

      const res = await cacheService.getOrFetch('any-key', dbFetcher, { ttlSeconds: 60 });
      expect(res.source).toBe('DB_MISS');
      expect(res.data).toEqual({ status: 'db-direct' });
      expect(dbFetcher).toHaveBeenCalledTimes(1);

      cacheService.config.enabled = true;
    });
  });

  describe('8. Private User Cache Isolation', () => {
    it('isolates User A orders from User B orders using deterministic namespaces', () => {
      const userAKey = AdvancedCacheService.keys.userOrders('user-A');
      const userBKey = AdvancedCacheService.keys.userOrders('user-B');

      cacheService.set(userAKey, [{ id: 'ord-100', owner: 'user-A' }], 60);
      cacheService.set(userBKey, [{ id: 'ord-200', owner: 'user-B' }], 60);

      const userAResult = cacheService.get(userAKey);
      const userBResult = cacheService.get(userBKey);

      expect(userAResult?.data[0].owner).toBe('user-A');
      expect(userBResult?.data[0].owner).toBe('user-B');
      expect(userAKey).not.toEqual(userBKey);
    });
  });

  describe('9. Telemetry & Metrics Verification', () => {
    it('accurately calculates hit rate and tracks telemetry metrics', () => {
      cacheService.set('metric-test', { ok: true }, 60);

      // 3 hits
      cacheService.get('metric-test');
      cacheService.get('metric-test');
      cacheService.get('metric-test');

      // 1 miss
      cacheService.get('non-existent-key');

      const metrics = cacheService.getMetrics();
      expect(metrics.cacheHits).toBe(3);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.hitRate).toBe(0.75); // 3 / (3 + 1) = 75%
      expect(metrics.topKeys.length).toBeGreaterThan(0);
    });
  });
});
