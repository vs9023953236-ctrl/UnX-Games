/**
 * UNX Games Admin Control Center & System Telemetry Engine
 * 
 * Provides centralized:
 * - Live System & API Monitoring (Requests/min, Latency P95, 4xx/5xx rates, active users)
 * - Subsystem Health Verification (API, DB, Auth, Cache, Realtime, R2)
 * - Safe Endpoint Policy & Rate Limit Configuration
 * - Realtime Invalidation & Sync Bus Inspection
 * - Request ID Tracing Buffer
 * - Anomaly Detection & Alert Engine
 */

import { Request } from 'express';
import { pool } from '../../src/db/index.js';
import { isSupabaseConfigured, getSupabaseClient } from '../supabaseClient.js';
import { testR2Connection } from '../r2.js';
import { cacheService } from './cacheService.js';
import { emitGhnSyncEvent } from '../syncEvents.js';
import { loadBalancer } from './loadBalancer.js';
import { backupService } from '../backupService.js';

export interface EndpointMetric {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  totalDurationMs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  latencies: number[];
  p95Ms: number;
  lastAccessed: string;
  // Configurable attributes
  enabled: boolean;
  rateLimitOverride?: number; // requests per minute
  cacheTtlOverride?: number;  // seconds
}

export interface RequestTraceItem {
  requestId: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  clientApp: string;
  ip: string;
  userId?: string;
  userRole?: string;
  cacheLookup?: string;
  error?: string;
}

export interface SystemAlert {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  subsystem: 'API' | 'DATABASE' | 'AUTH' | 'CACHE' | 'REALTIME' | 'STORAGE';
  title: string;
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

export type SubsystemStatus = 'ONLINE' | 'WARNING' | 'DEGRADED' | 'OFFLINE';

export interface SubsystemHealth {
  status: SubsystemStatus;
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export class ControlCenterService {
  private static instance: ControlCenterService;

  // Request & Metrics Store
  private totalRequests = 0;
  private status2xx = 0;
  private status3xx = 0;
  private status4xx = 0;
  private status5xx = 0;
  private rateLimitedCount = 0;

  // Rolling request timestamps for requests/min calculation
  private requestTimestamps: number[] = [];
  private endpointMetrics: Map<string, EndpointMetric> = new Map();
  private recentTraces: RequestTraceItem[] = []; // Circular buffer max 500
  private alerts: SystemAlert[] = [];
  private syncEventHistory: Array<{
    id: string;
    eventType: string;
    entityType?: string;
    entityId?: string;
    timestamp: string;
    status: 'SENT' | 'FAILED';
  }> = [];

  // Active user sessions tracking (timestamp -> userId / IP)
  private activeUserSessions: Map<string, { lastSeen: number; role?: string; ip: string }> = new Map();

  // Controlled Endpoint Overrides
  private endpointPolicies: Map<string, { enabled: boolean; rateLimit?: number; cacheTtl?: number }> = new Map();

  private constructor() {
    // Clean up rolling request timestamps every 30 seconds
    setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);

      // Clean up inactive user sessions older than 15 minutes
      const fifteenMinsAgo = Date.now() - 15 * 60000;
      for (const [key, session] of this.activeUserSessions.entries()) {
        if (session.lastSeen < fifteenMinsAgo) {
          this.activeUserSessions.delete(key);
        }
      }

      // Check alerts
      this.evaluateAlerts();
    }, 30000);
  }

  public static getInstance(): ControlCenterService {
    if (!ControlCenterService.instance) {
      ControlCenterService.instance = new ControlCenterService();
    }
    return ControlCenterService.instance;
  }

  // --------------------------------------------------------------------------
  // TELEMETRY RECORDING (Invoked by gateway logger & middleware)
  // --------------------------------------------------------------------------
  public recordRequest(params: {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    clientApp: string;
    ip: string;
    userId?: string;
    userRole?: string;
    cacheLookup?: string;
    error?: string;
  }): void {
    const now = Date.now();
    this.totalRequests++;
    this.requestTimestamps.push(now);

    // Status codes
    if (params.statusCode >= 500) this.status5xx++;
    else if (params.statusCode === 429) {
      this.status4xx++;
      this.rateLimitedCount++;
    } else if (params.statusCode >= 400) this.status4xx++;
    else if (params.statusCode >= 300) this.status3xx++;
    else if (params.statusCode >= 200) this.status2xx++;

    // Track active user/admin
    const sessionKey = params.userId || params.ip;
    this.activeUserSessions.set(sessionKey, {
      lastSeen: now,
      role: params.userRole,
      ip: params.ip,
    });

    // Endpoint aggregation
    // Normalize path to prevent cardinal explosion (e.g. /api/v1/games/free-fire -> /api/v1/games/:id)
    const normalizedPath = this.normalizeRoutePath(params.path);
    const endpointKey = `${params.method} ${normalizedPath}`;

    let epMetric = this.endpointMetrics.get(endpointKey);
    if (!epMetric) {
      epMetric = {
        endpoint: normalizedPath,
        method: params.method,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        totalDurationMs: 0,
        avgDurationMs: 0,
        maxDurationMs: 0,
        latencies: [],
        p95Ms: 0,
        lastAccessed: new Date().toISOString(),
        enabled: true,
      };
      this.endpointMetrics.set(endpointKey, epMetric);
    }

    epMetric.totalRequests++;
    epMetric.lastAccessed = new Date().toISOString();
    epMetric.totalDurationMs += params.durationMs;
    epMetric.maxDurationMs = Math.max(epMetric.maxDurationMs, params.durationMs);

    if (params.statusCode >= 400) {
      epMetric.failedRequests++;
      if (params.statusCode === 429) epMetric.rateLimitedRequests++;
    } else {
      epMetric.successfulRequests++;
    }

    // Keep last 100 latencies for P95 calculation
    epMetric.latencies.push(params.durationMs);
    if (epMetric.latencies.length > 100) epMetric.latencies.shift();

    epMetric.avgDurationMs = Math.round((epMetric.totalDurationMs / epMetric.totalRequests) * 10) / 10;
    epMetric.p95Ms = this.calculateP95(epMetric.latencies);

    // Record into Circular Trace Buffer (max 300)
    this.recentTraces.unshift({
      requestId: params.requestId,
      timestamp: new Date().toISOString(),
      method: params.method,
      path: params.path,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      clientApp: params.clientApp,
      ip: params.ip,
      userId: params.userId,
      userRole: params.userRole,
      cacheLookup: params.cacheLookup,
      error: params.error,
    });

    if (this.recentTraces.length > 300) {
      this.recentTraces.pop();
    }
  }

  public recordSyncEvent(item: { eventType: string; entityType?: string; entityId?: string; status: 'SENT' | 'FAILED' }) {
    this.syncEventHistory.unshift({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType: item.eventType,
      entityType: item.entityType,
      entityId: item.entityId,
      timestamp: new Date().toISOString(),
      status: item.status,
    });
    if (this.syncEventHistory.length > 50) this.syncEventHistory.pop();
  }

  // --------------------------------------------------------------------------
  // LIVE SYSTEM OVERVIEW & HEALTH SCORE
  // --------------------------------------------------------------------------
  public async getLiveOverview() {
    const [dbHealth, authHealth, r2Health, cacheMetrics, paymentHealth, backupJobs] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkAuthHealth(),
      this.checkR2Health(),
      Promise.resolve(cacheService.getMetrics()),
      this.checkPaymentHealth(),
      backupService.getBackupJobs(1).catch(() => []),
    ]);

    // API Gateway Health
    const oneMinReqs = this.requestTimestamps.length;
    const errorRate = this.totalRequests > 0 ? (this.status5xx / this.totalRequests) * 100 : 0;
    const apiStatus: SubsystemStatus = errorRate > 10 ? 'DEGRADED' : errorRate > 25 ? 'OFFLINE' : 'ONLINE';

    // Realtime Health
    const realtimeStatus: SubsystemStatus = isSupabaseConfigured() ? 'ONLINE' : 'WARNING';

    // Cache Health
    const cacheStatus: SubsystemStatus = cacheMetrics.enabled ? 'ONLINE' : 'WARNING';

    // Cluster & Queue Health
    const lbSnapshot = loadBalancer.getSnapshot();
    const workerStatus: SubsystemStatus = lbSnapshot.unhealthyWorkers > 0 ? 'DEGRADED' : 'ONLINE';
    const queueStatus: SubsystemStatus = lbSnapshot.activeConnections > 25 ? 'WARNING' : 'ONLINE';
    const lastBackup = backupJobs[0];
    const backupStatus: SubsystemStatus = !lastBackup ? 'ONLINE' : lastBackup.status === 'SUCCESS' ? 'ONLINE' : 'WARNING';

    // Calculate Overall System Status
    const subsystems = {
      api: { status: apiStatus, requestsPerMin: oneMinReqs, errorRatePercent: Math.round(errorRate * 10) / 10 },
      database: dbHealth,
      auth: authHealth,
      cache: { status: cacheStatus, ...cacheMetrics },
      realtime: { status: realtimeStatus, channel: 'ghn_sync_event_bus', recentEvents: this.syncEventHistory.slice(0, 5) },
      storage: r2Health,
      workers: { status: workerStatus, healthy: lbSnapshot.healthyWorkers, total: lbSnapshot.workers.length, algorithm: lbSnapshot.algorithm },
      payment: paymentHealth,
      queue: { status: queueStatus, activeConnections: lbSnapshot.activeConnections },
      backups: { status: backupStatus, lastBackupTime: lastBackup?.created_at || 'Data unavailable', lastStatus: lastBackup?.status || 'SUCCESS' },
    };

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    const degradedReasons: string[] = [];

    if (dbHealth.status === 'OFFLINE' || apiStatus === 'OFFLINE') {
      overallStatus = 'CRITICAL';
      degradedReasons.push('Critical service failure detected');
    } else if (
      dbHealth.status === 'DEGRADED' ||
      apiStatus === 'DEGRADED' ||
      r2Health.status === 'DEGRADED' ||
      authHealth.status === 'DEGRADED' ||
      workerStatus === 'DEGRADED'
    ) {
      overallStatus = 'DEGRADED';
      if (dbHealth.status !== 'ONLINE') degradedReasons.push(`Database: ${dbHealth.message || dbHealth.status}`);
      if (r2Health.status !== 'ONLINE') degradedReasons.push(`Storage: ${r2Health.message || r2Health.status}`);
      if (apiStatus !== 'ONLINE') degradedReasons.push(`API Error Rate: ${Math.round(errorRate)}%`);
      if (workerStatus !== 'ONLINE') degradedReasons.push(`Worker Cluster: ${lbSnapshot.unhealthyWorkers} offline`);
    }

    // Active users count
    let activeUsers = 0;
    let onlineAdmins = 0;
    for (const session of this.activeUserSessions.values()) {
      activeUsers++;
      if (['STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'ADMIN'].includes(session.role || '')) {
        onlineAdmins++;
      }
    }

    return {
      overallStatus,
      degradedReasons,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      subsystems,
      traffic: {
        totalRequests: this.totalRequests,
        requestsPerMinute: oneMinReqs,
        status2xx: this.status2xx,
        status3xx: this.status3xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        rateLimitedCount: this.rateLimitedCount,
        activeUsers,
        onlineAdmins,
      },
      activeAlertsCount: this.alerts.filter((a) => !a.acknowledged).length,
    };
  }

  // --------------------------------------------------------------------------
  // SUBSYSTEM HEALTH CHECKERS
  // --------------------------------------------------------------------------
  public async checkDatabaseHealth(): Promise<SubsystemHealth> {
    const start = Date.now();
    try {
      await pool.query('SELECT 1');
      const latencyMs = Date.now() - start;
      return {
        status: latencyMs > 1500 ? 'WARNING' : 'ONLINE',
        latencyMs,
        message: 'PostgreSQL connection operational',
      };
    } catch (err: any) {
      return {
        status: 'DEGRADED',
        latencyMs: Date.now() - start,
        message: err.message || 'Database connection error, active fallback running',
      };
    }
  }

  public async checkAuthHealth(): Promise<SubsystemHealth> {
    try {
      const isConfig = isSupabaseConfigured();
      if (!isConfig) {
        return {
          status: 'WARNING',
          message: 'Supabase Auth operating on local session fallback',
        };
      }
      return {
        status: 'ONLINE',
        message: 'Supabase Auth operational',
      };
    } catch (err: any) {
      return {
        status: 'DEGRADED',
        message: err.message || 'Auth check error',
      };
    }
  }

  private lastR2Health: { result: SubsystemHealth; timestamp: number } | null = null;

  public async checkR2Health(): Promise<SubsystemHealth> {
    const now = Date.now();
    if (this.lastR2Health && (now - this.lastR2Health.timestamp) < 30000) {
      return this.lastR2Health.result;
    }
    try {
      const res = await testR2Connection();
      const result: SubsystemHealth = {
        status: res.success ? 'ONLINE' : 'DEGRADED',
        latencyMs: res.latencyMs || 0,
        message: res.message,
        details: { bucket: res.bucket, publicDomain: res.publicDomain },
      };
      this.lastR2Health = { result, timestamp: now };
      return result;
    } catch (err: any) {
      const result: SubsystemHealth = {
        status: 'DEGRADED',
        message: err.message || 'R2 connection test failed',
      };
      this.lastR2Health = { result, timestamp: now };
      return result;
    }
  }

  public async checkPaymentHealth(): Promise<SubsystemHealth> {
    try {
      const res = await pool.query(`SELECT esewa_enabled, khalti_enabled FROM payment_settings WHERE id = 'default' LIMIT 1`).catch(() => ({ rows: [] }));
      const row = res.rows[0];
      const esewa = row?.esewa_enabled ?? true;
      const khalti = row?.khalti_enabled ?? true;
      const activeCount = (esewa ? 1 : 0) + (khalti ? 1 : 0);
      return {
        status: activeCount > 0 ? 'ONLINE' : 'WARNING',
        message: activeCount > 0 ? `eSewa & Khalti online (${activeCount} gateways active)` : 'All payment gateways currently disabled',
        details: { esewa, khalti },
      };
    } catch (e: any) {
      return { status: 'DEGRADED', message: e?.message || 'Payment settings check error' };
    }
  }

  // --------------------------------------------------------------------------
  // DETAILED API ENDPOINT & RATE LIMIT MONITOR
  // --------------------------------------------------------------------------
  public getApiMonitorData() {
    const endpointsList = Array.from(this.endpointMetrics.values());

    // Sort Top Endpoints by requests
    const topEndpoints = [...endpointsList].sort((a, b) => b.totalRequests - a.totalRequests).slice(0, 10);

    // Sort Slow Endpoints by average latency
    const slowEndpoints = endpointsList.filter((e) => e.avgDurationMs > 400).sort((a, b) => b.avgDurationMs - a.avgDurationMs).slice(0, 10);

    // Failed Endpoints
    const failedEndpoints = endpointsList.filter((e) => e.failedRequests > 0).sort((a, b) => b.failedRequests - a.failedRequests).slice(0, 10);

    return {
      totalEndpointsTracked: endpointsList.length,
      topEndpoints,
      slowEndpoints,
      failedEndpoints,
      recentTraces: this.recentTraces.slice(0, 50),
    };
  }

  // --------------------------------------------------------------------------
  // REQUEST ID TRACING
  // --------------------------------------------------------------------------
  public traceRequest(requestId: string): RequestTraceItem | null {
    const found = this.recentTraces.find((t) => t.requestId === requestId);
    return found || null;
  }

  // --------------------------------------------------------------------------
  // ANOMALY DETECTION & ALERTS
  // --------------------------------------------------------------------------
  private evaluateAlerts(): void {
    const errorRate = this.totalRequests > 50 ? (this.status5xx / this.totalRequests) * 100 : 0;
    if (errorRate > 5) {
      this.triggerAlert({
        id: 'alert_high_5xx',
        level: 'CRITICAL',
        subsystem: 'API',
        title: 'Elevated 5xx Server Error Rate',
        message: `API gateway 5xx error rate has climbed to ${Math.round(errorRate)}%. Inspect recent error traces.`,
      });
    }

    if (this.rateLimitedCount > 25) {
      this.triggerAlert({
        id: 'alert_rate_limits',
        level: 'WARNING',
        subsystem: 'API',
        title: 'Spike in Rate-Limited Requests',
        message: `${this.rateLimitedCount} requests were blocked by rate limiting within the active window.`,
      });
    }
  }

  public resetMetrics(): void {
    this.status4xx = 0;
    this.status5xx = 0;
    this.rateLimitedCount = 0;
    for (const ep of this.endpointMetrics.values()) {
      ep.failedRequests = 0;
      ep.rateLimitedRequests = 0;
    }
    this.recentTraces = this.recentTraces.filter((t) => t.statusCode < 400);
    this.alerts = [];
  }

  public triggerAlert(alert: Omit<SystemAlert, 'timestamp'>): void {
    const existing = this.alerts.find((a) => a.id === alert.id);
    if (!existing) {
      this.alerts.unshift({
        ...alert,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
      if (this.alerts.length > 20) this.alerts.pop();
    }
  }

  public getAlerts(): SystemAlert[] {
    return this.alerts;
  }

  public dismissAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------
  private normalizeRoutePath(rawPath: string): string {
    const pathWithoutQuery = rawPath.split('?')[0];
    return pathWithoutQuery
      .replace(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }

  private calculateP95(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(index, sorted.length - 1)];
  }
}

export const controlCenter = ControlCenterService.getInstance();
