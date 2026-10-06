/**
 * UNX Games Advanced Cache Service
 * 
 * Video-Aligned Architecture:
 * - Database as Authoritative Source of Truth
 * - Cache-Aside Read Pattern
 * - LFU (Least Frequently Used) Eviction with LRU (Least Recently Used) Tie-Breaker
 * - Deterministic Key Namespacing & Versioning
 * - Stale-While-Revalidate (SWR) for Safe Public Catalogs
 * - Cache Stampede Protection (In-Flight Promise Coalescing)
 * - Fault-Tolerant Database Fallback
 * - Realtime Invalidation Map Integration
 * - Full Metrics Tracking (Hits, Misses, Hit Rate, Evictions)
 */

import crypto from 'crypto';
import { pool } from '../../src/db/index.js';
import { emitGhnSyncEvent } from '../syncEvents.js';
import {
  redisGet,
  redisSet,
  redisDel,
  redisDelByPattern,
  invalidateRedisCache,
  getRedisMetrics,
  isRedisHealthy,
  getRedisStatus
} from '../redis.js';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  etag: string;
  frequency: number;          // LFU counter
  createdAt: number;
  lastAccessedAt: number;     // LRU tie-breaker
  staleAt: number;            // SWR threshold
  expiresAt: number;          // Hard expiration
  tags: string[];
  sizeBytes: number;
}

export interface CacheMetrics {
  enabled: boolean;
  cacheVersion: string;
  lastInvalidatedAt: string | null;
  lastWarmedAt: string | null;
  l1: {
    status: 'active' | 'disabled';
    totalItems: number;
    maxItems: number;
    memoryUsageEstimateKb: number;
    evictions: number;
    expiredEntries: number;
  };
  l2: any;
  database: {
    status: string;
    sourceOfTruth: string;
  };
  totalItems: number;
  maxItems: number;
  cacheHits: number;
  cacheMisses: number;
  staleHits: number;
  hitRate: number;
  evictions: number;
  expiredEntries: number;
  errors: number;
  averageGetTimeMs: number;
  averageSetTimeMs: number;
  memoryUsageEstimateKb: number;
  topKeys: Array<{ key: string; frequency: number; lastAccessedAt: string }>;
}

export interface CachePolicy {
  ttlSeconds: number;
  staleGraceSeconds?: number;
  tags?: string[];
  allowStale?: boolean;
}

export const CACHE_VERSION = 'v1';

export class AdvancedCacheService {
  private static instance: AdvancedCacheService;
  private store: Map<string, CacheEntry> = new Map();
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  // State tracking
  private lastInvalidatedAt: string | null = null;
  private lastWarmedAt: string | null = null;

  // Metrics Counters
  private metrics = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0,
    expired: 0,
    errors: 0,
    totalGetTimeMs: 0,
    getOps: 0,
    totalSetTimeMs: 0,
    setOps: 0,
  };

  // Configurable Limits & TTLs (with environment fallback)
  public readonly config = {
    enabled: process.env.CACHE_ENABLED !== 'false',
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '180', 10),
    gamesTtl: parseInt(process.env.CACHE_GAMES_TTL || '300', 10),         // 5m
    productsTtl: parseInt(process.env.CACHE_PRODUCTS_TTL || '120', 10),   // 2m
    packagesTtl: parseInt(process.env.CACHE_PACKAGES_TTL || '120', 10),   // 2m
    bannersTtl: parseInt(process.env.CACHE_BANNERS_TTL || '300', 10),     // 5m
    offersTtl: parseInt(process.env.CACHE_OFFERS_TTL || '120', 10),       // 2m
    newsTtl: parseInt(process.env.CACHE_NEWS_TTL || '300', 10),           // 5m
    categoriesTtl: parseInt(process.env.CACHE_CATEGORIES_TTL || '600', 10), // 10m
  };

  private constructor() {
    // Periodic garbage collection of fully expired keys every 60 seconds
    setInterval(() => {
      this.evictExpired();
    }, 60000);
  }

  public static getInstance(): AdvancedCacheService {
    if (!AdvancedCacheService.instance) {
      AdvancedCacheService.instance = new AdvancedCacheService();
    }
    return AdvancedCacheService.instance;
  }

  // --------------------------------------------------------------------------
  // DETERMINISTIC KEY BUILDERS
  // --------------------------------------------------------------------------
  public static buildKey(namespace: string, idOrScope?: string | number): string {
    const scopeStr = idOrScope !== undefined && idOrScope !== null ? `:${idOrScope}` : '';
    return `unx:${CACHE_VERSION}:${namespace}${scopeStr}`;
  }

  public static keys = {
    gamesList: () => AdvancedCacheService.buildKey('games', 'list'),
    gameDetail: (id: string | number) => AdvancedCacheService.buildKey('games', id),
    gamePackages: (id: string | number) => AdvancedCacheService.buildKey('packages', id),
    packages: (id: string | number) => AdvancedCacheService.buildKey('packages', id),
    gameOffers: (id: string | number) => AdvancedCacheService.buildKey('offers', id),
    productsList: () => AdvancedCacheService.buildKey('products', 'list'),
    productDetail: (id: string | number) => AdvancedCacheService.buildKey('products', id),
    categoriesList: () => AdvancedCacheService.buildKey('categories', 'list'),
    bannersList: () => AdvancedCacheService.buildKey('banners', 'list'),
    offersList: () => AdvancedCacheService.buildKey('offers', 'list'),
    newsList: () => AdvancedCacheService.buildKey('news', 'list'),
    couponsAvailable: () => AdvancedCacheService.buildKey('coupons', 'available'),
    // Private user cache keys
    userProfile: (userId: string) => AdvancedCacheService.buildKey(`user:${userId}`, 'profile'),
    userOrders: (userId: string) => AdvancedCacheService.buildKey(`user:${userId}`, 'orders'),
    userNotifications: (userId: string) => AdvancedCacheService.buildKey(`user:${userId}`, 'notifications'),
    // Admin cache keys
    adminStats: () => AdvancedCacheService.buildKey('admin', 'stats'),
    adminDashboard: () => AdvancedCacheService.buildKey('admin', 'dashboard'),
  };

  // --------------------------------------------------------------------------
  // CORE GET / SET / HAS / DELETE OPERATIONS
  // --------------------------------------------------------------------------

  public has(key: string): boolean {
    if (!this.config.enabled) return false;
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.metrics.expired++;
      return false;
    }
    return true;
  }

  public get<T = any>(key: string): { data: T; isStale: boolean; etag: string } | null {
    if (!this.config.enabled) return null;
    const start = Date.now();

    try {
      const entry = this.store.get(key);
      if (!entry) {
        this.metrics.misses++;
        return null;
      }

      const now = Date.now();

      // Check hard expiry
      if (entry.expiresAt < now) {
        this.store.delete(key);
        this.metrics.expired++;
        this.metrics.misses++;
        return null;
      }

      // Record LFU frequency and LRU last accessed timestamp
      entry.frequency++;
      entry.lastAccessedAt = now;

      const isStale = now > entry.staleAt;
      if (isStale) {
        this.metrics.staleHits++;
      } else {
        this.metrics.hits++;
      }

      const elapsed = Date.now() - start;
      this.metrics.totalGetTimeMs += elapsed;
      this.metrics.getOps++;

      return {
        data: entry.value as T,
        isStale,
        etag: entry.etag,
      };
    } catch (err) {
      this.metrics.errors++;
      console.warn(`[CACHE GET ERROR] on ${key}:`, err);
      return null; // Graceful DB fallback
    }
  }

  public async getAsync<T = any>(key: string): Promise<{ data: T; isStale: boolean; etag: string } | null> {
    if (!this.config.enabled) return null;
    
    // 1. Check local L1 memory store
    const local = this.get<T>(key);
    if (local) return local;

    // 2. Check remote L2 Redis cache
    try {
      const redisVal = await redisGet<T>(key);
      if (redisVal !== null && redisVal !== undefined) {
        // Populate local L1 store
        this.set(key, redisVal, this.config.defaultTtl);
        return this.get<T>(key);
      }
    } catch {}

    return null;
  }

  public set<T = any>(
    key: string,
    value: T,
    ttlSeconds: number = this.config.defaultTtl,
    tags: string[] = [],
    staleGraceSeconds: number = 60
  ): boolean {
    if (!this.config.enabled) return false;
    const start = Date.now();

    try {
      // Enforce LFU / LRU Eviction when capacity limit is reached
      if (this.store.size >= this.config.maxItems && !this.store.has(key)) {
        this.evictLFU();
      }

      const now = Date.now();
      const staleAt = now + Math.max(1, ttlSeconds) * 1000;
      const expiresAt = staleAt + Math.max(0, staleGraceSeconds) * 1000;

      // Deterministic ETag generation based on value snapshot
      let jsonStr = '';
      try {
        jsonStr = JSON.stringify(value);
      } catch {
        jsonStr = String(value);
      }

      const etag = `W/"unx-${crypto.createHash('sha256').update(jsonStr).digest('hex').substring(0, 16)}"`;
      const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');

      const existing = this.store.get(key);
      const frequency = existing ? existing.frequency + 1 : 1;

      this.store.set(key, {
        key,
        value,
        etag,
        frequency,
        createdAt: now,
        lastAccessedAt: now,
        staleAt,
        expiresAt,
        tags,
        sizeBytes,
      });

      // Synchronize into Redis L2 tier with explicit TTL
      redisSet(key, value, ttlSeconds).catch(() => {});

      const elapsed = Date.now() - start;
      this.metrics.totalSetTimeMs += elapsed;
      this.metrics.setOps++;

      return true;
    } catch (err) {
      this.metrics.errors++;
      console.warn(`[CACHE SET ERROR] on ${key}:`, err);
      return false;
    }
  }

  public delete(key: string): boolean {
    redisDel(key).catch(() => {});
    return this.store.delete(key);
  }

  public clear(resetMetrics = false): void {
    this.store.clear();
    this.inFlightRequests.clear();
    invalidateRedisCache('all').catch(() => {});
    if (resetMetrics) {
      this.resetMetrics();
    }
  }

  public resetMetrics(): void {
    this.metrics.hits = 0;
    this.metrics.misses = 0;
    this.metrics.staleHits = 0;
    this.metrics.evictions = 0;
    this.metrics.expired = 0;
    this.metrics.errors = 0;
    this.metrics.totalGetTimeMs = 0;
    this.metrics.getOps = 0;
    this.metrics.totalSetTimeMs = 0;
    this.metrics.setOps = 0;
  }

  // --------------------------------------------------------------------------
  // LFU EVICTION WITH LRU TIE-BREAKER
  // --------------------------------------------------------------------------
  /**
   * When capacity limit is reached, evict entry with lowest frequency.
   * If frequencies are equal, evict least recently used (lowest lastAccessedAt).
   */
  private evictLFU(): void {
    if (this.store.size === 0) return;

    let candidateKey: string | null = null;
    let minFrequency = Infinity;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.frequency < minFrequency) {
        minFrequency = entry.frequency;
        oldestAccess = entry.lastAccessedAt;
        candidateKey = key;
      } else if (entry.frequency === minFrequency) {
        // LRU Tie-breaker
        if (entry.lastAccessedAt < oldestAccess) {
          oldestAccess = entry.lastAccessedAt;
          candidateKey = key;
        }
      }
    }

    if (candidateKey) {
      this.store.delete(candidateKey);
      this.metrics.evictions++;
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        this.metrics.expired++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // CACHE STAMPEDE PROTECTION (In-Flight Request Coalescing)
  // --------------------------------------------------------------------------
  /**
   * Wraps an authoritative DB fetch. If 100 users request the same key
   * simultaneously on cache miss, only 1 DB query executes. The remaining 99
   * await the identical in-flight Promise.
   */
  public async getOrFetch<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    policy: CachePolicy
  ): Promise<{ data: T; source: 'CACHE_HIT' | 'STALE_HIT' | 'DB_MISS'; etag?: string }> {
    // 1. Fast Cache Read
    const cached = this.get<T>(key);
    if (cached) {
      if (!cached.isStale || !policy.allowStale) {
        return { data: cached.data, source: 'CACHE_HIT', etag: cached.etag };
      }

      // If stale hit is allowed, trigger background revalidation without blocking
      this.revalidateInBackground(key, fetcher, policy);
      return { data: cached.data, source: 'STALE_HIT', etag: cached.etag };
    }

    // 2. Cache Miss: Coalesce simultaneous requests to prevent cache stampede
    let inFlight = this.inFlightRequests.get(key);
    if (!inFlight) {
      inFlight = (async () => {
        try {
          const freshData = await fetcher();
          if (freshData !== null && freshData !== undefined) {
            this.set(
              key,
              freshData,
              policy.ttlSeconds,
              policy.tags || [],
              policy.staleGraceSeconds ?? 60
            );
          }
          return freshData;
        } finally {
          this.inFlightRequests.delete(key);
        }
      })();

      this.inFlightRequests.set(key, inFlight);
    }

    const result = await inFlight;
    return { data: result, source: 'DB_MISS' };
  }

  private revalidateInBackground<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    policy: CachePolicy
  ): void {
    if (this.inFlightRequests.has(key)) return;

    const bgPromise = (async () => {
      try {
        const fresh = await fetcher();
        if (fresh !== null && fresh !== undefined) {
          this.set(
            key,
            fresh,
            policy.ttlSeconds,
            policy.tags || [],
            policy.staleGraceSeconds ?? 60
          );
        }
      } catch (err) {
        console.warn(`[BG SWR REVALIDATE FAILED] ${key}:`, err);
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, bgPromise);
  }

  // --------------------------------------------------------------------------
  // CENTRALIZED INVALIDATION MAP & REALTIME EVENT EMISSION
  // --------------------------------------------------------------------------
  public invalidateTag(tag: string): number {
    this.lastInvalidatedAt = new Date().toISOString();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag) || key.includes(`:${tag}:`) || key.endsWith(`:${tag}`)) {
        this.store.delete(key);
        count++;
      }
    }
    // Also purge matching patterns in Redis L2 tier
    redisDelByPattern(`*${tag}*`).catch(() => {});
    return count;
  }

  public invalidatePattern(pattern: RegExp | string): number {
    this.lastInvalidatedAt = new Date().toISOString();
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    if (typeof pattern === 'string') {
      redisDelByPattern(pattern).catch(() => {});
    }
    return count;
  }

  /**
   * Invoked after any database mutation to purge all affected cache keys
   * and broadcast a realtime sync event across the cluster.
   */
  public async onEntityMutated(
    entityType: 'product' | 'game' | 'banner' | 'offer' | 'news' | 'category' | 'coupon' | 'settings' | 'order' | 'wallet',
    entityId?: string,
    safeMetadata: Record<string, any> = {}
  ): Promise<void> {
    this.lastInvalidatedAt = new Date().toISOString();
    switch (entityType) {
      case 'product':
        this.invalidateTag('products');
        this.invalidateTag('packages');
        this.invalidateTag('games');
        if (entityId) this.delete(AdvancedCacheService.keys.productDetail(entityId));
        break;

      case 'game':
        this.invalidateTag('games');
        this.invalidateTag('packages');
        if (entityId) {
          this.delete(AdvancedCacheService.keys.gameDetail(entityId));
          this.delete(AdvancedCacheService.keys.gamePackages(entityId));
          this.delete(AdvancedCacheService.keys.gameOffers(entityId));
        }
        break;

      case 'banner':
        this.invalidateTag('banners');
        this.delete(AdvancedCacheService.keys.bannersList());
        break;

      case 'offer':
        this.invalidateTag('offers');
        this.delete(AdvancedCacheService.keys.offersList());
        break;

      case 'news':
        this.invalidateTag('news');
        this.delete(AdvancedCacheService.keys.newsList());
        break;

      case 'category':
        this.invalidateTag('categories');
        this.invalidateTag('games');
        this.delete(AdvancedCacheService.keys.categoriesList());
        break;

      case 'coupon':
        this.invalidateTag('coupons');
        this.delete(AdvancedCacheService.keys.couponsAvailable());
        break;

      case 'settings':
        this.invalidateTag('settings');
        this.invalidateTag('banners');
        break;

      case 'order':
        if (safeMetadata.userId) {
          this.delete(AdvancedCacheService.keys.userOrders(safeMetadata.userId));
        }
        break;

      case 'wallet':
        if (safeMetadata.userId) {
          this.delete(AdvancedCacheService.keys.userProfile(safeMetadata.userId));
        }
        break;
    }

    // Invalidate Redis L2 tier across the cluster
    try {
      const redisEntity = entityType === 'product' ? 'products'
        : entityType === 'game' ? 'games'
        : entityType === 'banner' ? 'banners'
        : entityType === 'offer' ? 'offers'
        : entityType === 'news' ? 'news'
        : entityType === 'category' ? 'categories'
        : entityType === 'settings' ? 'settings'
        : entityType === 'order' ? 'orders'
        : 'products';
      
      invalidateRedisCache(redisEntity, {
        id: entityId,
        customerId: safeMetadata?.userId
      }).catch(() => {});
    } catch {}

    // Invalidate Admin overview caches
    this.delete(AdvancedCacheService.keys.adminStats());
    this.delete(AdvancedCacheService.keys.adminDashboard());

    // Broadcast Realtime Invalidation Event
    await emitGhnSyncEvent({
      eventType: `${entityType.toUpperCase()}_MUTATED`,
      entityType,
      entityId,
      safeMetadata,
    }).catch(() => false);
  }

  // --------------------------------------------------------------------------
  // CACHE WARM-UP ROUTINE
  // --------------------------------------------------------------------------
  public async warmUp(
    entities: string[] = ['products', 'categories', 'games', 'banners', 'offers', 'news', 'settings']
  ): Promise<{ success: boolean; warmedEntities: Record<string, number>; durationMs: number }> {
    const start = Date.now();
    const warmed: Record<string, number> = {};

    try {
      if (entities.includes('products')) {
        const prodRes = await pool.query(`
          SELECT p.*, 
            COALESCE(json_agg(
              json_build_object(
                'id', pkg.id,
                'name', pkg.name,
                'amount', pkg.amount,
                'unit', pkg.unit,
                'price', pkg.price,
                'compareAtPrice', pkg.compare_at_price,
                'discount', pkg.discount,
                'badge', pkg.badge,
                'active', pkg.active,
                'displayOrder', pkg.display_order
              ) ORDER BY pkg.display_order ASC
            ) FILTER (WHERE pkg.id IS NOT NULL), '[]'::json) as packages
          FROM products p
          LEFT JOIN product_packages pkg ON p.id = pkg.product_id AND pkg.active = true
          WHERE p.active = true
          GROUP BY p.id
          ORDER BY p.display_order ASC, p.name ASC;
        `);

        const productsList = prodRes.rows || [];
        this.set(AdvancedCacheService.keys.productsList(), { success: true, products: productsList }, this.config.productsTtl, ['products']);
        this.set('unx:v1:products', { success: true, products: productsList }, this.config.productsTtl, ['products']);

        for (const prod of productsList) {
          this.set(AdvancedCacheService.keys.productDetail(prod.id), { success: true, product: prod }, this.config.productsTtl, ['products', `product:${prod.id}`]);
          if (prod.slug) {
            this.set(AdvancedCacheService.keys.productDetail(prod.slug), { success: true, product: prod }, this.config.productsTtl, ['products', `product:${prod.id}`]);
          }
          if (Array.isArray(prod.packages) && prod.packages.length > 0) {
            this.set(AdvancedCacheService.keys.gamePackages(prod.id), { success: true, packages: prod.packages }, this.config.packagesTtl, ['packages', `packages:${prod.id}`]);
          }
        }
        warmed.products = productsList.length;
      }

      if (entities.includes('categories')) {
        const catRes = await pool.query('SELECT * FROM categories WHERE active = true ORDER BY display_order ASC, name ASC');
        const categories = catRes.rows || [];
        this.set(AdvancedCacheService.keys.categoriesList(), { success: true, categories }, this.config.categoriesTtl, ['categories']);
        this.set('unx:v1:categories', { success: true, categories }, this.config.categoriesTtl, ['categories']);
        warmed.categories = categories.length;
      }

      if (entities.includes('games')) {
        const gamesRes = await pool.query('SELECT * FROM games WHERE active = true ORDER BY display_order ASC, name ASC');
        const games = gamesRes.rows || [];
        this.set(AdvancedCacheService.keys.gamesList(), { success: true, games }, this.config.gamesTtl, ['games']);
        this.set('unx:v1:games', { success: true, games }, this.config.gamesTtl, ['games']);
        for (const g of games) {
          this.set(AdvancedCacheService.keys.gameDetail(g.id), { success: true, game: g }, this.config.gamesTtl, ['games', `game:${g.id}`]);
          if (g.slug) {
            this.set(AdvancedCacheService.keys.gameDetail(g.slug), { success: true, game: g }, this.config.gamesTtl, ['games', `game:${g.id}`]);
          }
        }
        warmed.games = games.length;
      }

      if (entities.includes('banners')) {
        const banRes = await pool.query('SELECT * FROM banners WHERE active = true ORDER BY display_order ASC, created_at DESC');
        const banners = banRes.rows || [];
        this.set(AdvancedCacheService.keys.bannersList(), { success: true, banners }, this.config.bannersTtl, ['banners']);
        this.set('unx:v1:banners', { success: true, banners }, this.config.bannersTtl, ['banners']);
        warmed.banners = banners.length;
      }

      if (entities.includes('offers')) {
        const offRes = await pool.query('SELECT * FROM offers WHERE active = true ORDER BY created_at DESC');
        const offers = offRes.rows || [];
        this.set(AdvancedCacheService.keys.offersList(), { success: true, offers }, this.config.offersTtl, ['offers']);
        this.set('unx:v1:offers', { success: true, offers }, this.config.offersTtl, ['offers']);
        warmed.offers = offers.length;
      }

      if (entities.includes('news')) {
        const newsRes = await pool.query('SELECT * FROM news WHERE published = true ORDER BY created_at DESC');
        const news = newsRes.rows || [];
        this.set(AdvancedCacheService.keys.newsList(), { success: true, news }, this.config.newsTtl, ['news']);
        this.set('unx:v1:news', { success: true, news }, this.config.newsTtl, ['news']);
        warmed.news = news.length;
      }

      if (entities.includes('settings')) {
        const setRes = await pool.query('SELECT * FROM app_settings ORDER BY id ASC LIMIT 1');
        const settings = setRes.rows[0] || {};
        this.set('unx:v1:settings', { success: true, settings }, this.config.defaultTtl, ['settings']);
        warmed.settings = 1;
      }

      this.lastWarmedAt = new Date().toISOString();
      return {
        success: true,
        warmedEntities: warmed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      console.warn('[Cache Warm-Up Error]:', err?.message || err);
      return {
        success: false,
        warmedEntities: warmed,
        durationMs: Date.now() - start,
      };
    }
  }

  // --------------------------------------------------------------------------
  // TELEMETRY & MONITORING METRICS
  // --------------------------------------------------------------------------
  public getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits + this.metrics.staleHits) / totalRequests : 0;

    let totalSizeBytes = 0;
    const topKeysList: Array<{ key: string; frequency: number; lastAccessedAt: string }> = [];

    for (const [key, entry] of this.store.entries()) {
      totalSizeBytes += entry.sizeBytes || 100;
      topKeysList.push({
        key,
        frequency: entry.frequency,
        lastAccessedAt: new Date(entry.lastAccessedAt).toISOString(),
      });
    }

    topKeysList.sort((a, b) => b.frequency - a.frequency);

    const memKb = Math.round(totalSizeBytes / 1024);

    return {
      enabled: this.config.enabled,
      cacheVersion: `unx:${CACHE_VERSION}`,
      lastInvalidatedAt: this.lastInvalidatedAt,
      lastWarmedAt: this.lastWarmedAt,
      l1: {
        status: this.config.enabled ? 'active' : 'disabled',
        totalItems: this.store.size,
        maxItems: this.config.maxItems,
        memoryUsageEstimateKb: memKb,
        evictions: this.metrics.evictions,
        expiredEntries: this.metrics.expired,
      },
      l2: getRedisMetrics(),
      database: {
        status: 'connected',
        sourceOfTruth: 'Supabase PostgreSQL',
      },
      totalItems: this.store.size,
      maxItems: this.config.maxItems,
      cacheHits: this.metrics.hits,
      cacheMisses: this.metrics.misses,
      staleHits: this.metrics.staleHits,
      hitRate: Math.round(hitRate * 1000) / 1000,
      evictions: this.metrics.evictions,
      expiredEntries: this.metrics.expired,
      errors: this.metrics.errors,
      averageGetTimeMs: this.metrics.getOps > 0 ? Math.round((this.metrics.totalGetTimeMs / this.metrics.getOps) * 100) / 100 : 0,
      averageSetTimeMs: this.metrics.setOps > 0 ? Math.round((this.metrics.totalSetTimeMs / this.metrics.setOps) * 100) / 100 : 0,
      memoryUsageEstimateKb: memKb,
      topKeys: topKeysList.slice(0, 10),
    };
  }
}

// Global Singleton Instance
export const cacheService = AdvancedCacheService.getInstance();
