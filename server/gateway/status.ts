import { Request, Response } from 'express';
import { pool } from '../../src/db/index.js';
import { isSupabaseConfigured, getSupabaseClient } from '../supabaseClient.js';
import { testR2Connection } from '../r2.js';
import { sendGatewaySuccess } from './response.js';
import { cacheService } from './cacheService.js';
import { getRedisStatus, getRedisMetrics } from '../redis.js';
import { rateLimitService } from './rateLimitEngine.js';
import { loadBalancer } from './loadBalancer.js';

export async function getGatewayStatusHandler(req: Request, res: Response) {
  const startTime = Date.now();

  // 1. Database Health Check (PostgreSQL / Supabase connection pool)
  let dbStatus: 'ONLINE' | 'WARNING' | 'DEGRADED' | 'OFFLINE' = 'OFFLINE';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = dbLatencyMs > 1500 ? 'WARNING' : 'ONLINE';
  } catch (err: any) {
    dbStatus = 'DEGRADED';
  }

  // 2. Supabase Integration Status
  const supabaseActive = isSupabaseConfigured();
  const supabaseStatus: 'ONLINE' | 'WARNING' = supabaseActive ? 'ONLINE' : 'WARNING';

  // 3. Storage (R2) Status
  let storageStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
  let r2LatencyMs = 0;
  try {
    const r2Test = await testR2Connection();
    storageStatus = r2Test.success ? 'ONLINE' : 'DEGRADED';
    r2LatencyMs = r2Test.latencyMs || 0;
  } catch {
    storageStatus = 'DEGRADED';
  }

  // 4. L1 Memory Cache Status
  const cacheMetrics = cacheService.getMetrics();
  const l1Status: 'ONLINE' | 'WARNING' = cacheMetrics.enabled ? 'ONLINE' : 'WARNING';

  // 5. L2 Redis Status
  const redisRawStatus = getRedisStatus();
  const redisMetrics = getRedisMetrics();
  const l2RedisStatus: 'ONLINE' | 'DEGRADED' | 'DISABLED' = 
    redisRawStatus === 'ok' ? 'ONLINE' : redisRawStatus === 'disabled' ? 'DISABLED' : 'DEGRADED';

  // 6. Rate Limiter Status
  const rateLimitSnapshot = rateLimitService.getSnapshot();
  const rateLimitStatus: 'ONLINE' | 'WARNING' = 'ONLINE';

  // 7. Load Balancer Status
  const lbSnapshot = loadBalancer.getSnapshot();
  const lbStatus: 'ONLINE' | 'WARNING' = lbSnapshot.unhealthyWorkers > 0 ? 'WARNING' : 'ONLINE';

  const memoryUsage = process.memoryUsage();

  const statusPayload = {
    gateway: {
      name: 'UNX Games High-Performance API Gateway',
      status: dbStatus === 'DEGRADED' ? 'DEGRADED' : 'ONLINE',
      version: 'v1.0.0',
      environment: process.env.NODE_ENV || 'production',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    subsystems: {
      api: {
        status: 'ONLINE',
        targetP50Ms: '<50ms',
        targetP95Ms: '<100ms',
      },
      database: {
        provider: supabaseActive ? 'supabase_postgres' : 'postgres',
        sourceOfTruth: 'AUTHORITATIVE_POSTGRESQL',
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      supabase_auth: {
        status: supabaseStatus,
        mode: supabaseActive ? 'MANAGED_SUPABASE_AUTH' : 'LOCAL_SESSION_FALLBACK',
      },
      realtime: {
        status: supabaseActive ? 'ONLINE' : 'WARNING',
        channel: 'ghn_sync_event_bus',
      },
      storage_r2: {
        provider: 'cloudflare_r2',
        status: storageStatus,
        latencyMs: r2LatencyMs,
      },
      l1_cache: {
        status: l1Status,
        engine: 'LFU_LRU_IN_MEMORY',
        items: cacheMetrics.totalItems,
        hitRate: cacheMetrics.hitRate,
        memoryKb: cacheMetrics.memoryUsageEstimateKb,
      },
      l2_redis: {
        status: l2RedisStatus,
        connected: redisMetrics.connected,
        tls: redisMetrics.tlsEnabled,
        hitRate: redisMetrics.hitRate,
        latencyMs: redisMetrics.latencyMs,
      },
      rate_limiter: {
        status: rateLimitStatus,
        distributed: rateLimitSnapshot.distributed,
        backend: rateLimitSnapshot.backend,
        algorithms: rateLimitSnapshot.algorithms,
      },
      load_balancer: {
        status: lbStatus,
        mode: lbSnapshot.mode,
        algorithm: lbSnapshot.algorithm,
        activeConnections: lbSnapshot.activeConnections,
        workersHealthy: lbSnapshot.healthyWorkers,
        workersTotal: lbSnapshot.totalWorkers,
      },
    },
    system: {
      nodeVersion: process.version,
      rssMemoryMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
    },
    responseTimeMs: Date.now() - startTime,
  };

  return sendGatewaySuccess(req, res, statusPayload);
}
