import { Express, Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './requestId.js';
import { gatewayLogger } from './logger.js';
import { loadBalancerMiddleware, loadBalancer } from './loadBalancer.js';
import { getGatewayStatusHandler } from './status.js';
import { v1Router } from './v1Router.js';
import { sendGatewaySuccess, sendGatewayError } from './response.js';
import { idempotencyMiddleware, requireIdempotencyKey } from './idempotency.js';
import { gatewayCache, invalidateCacheTag, invalidateAllCache } from './cache.js';
import { controlCenter } from './controlCenter.js';
import { cacheService } from './cacheService.js';
import { authenticateUser, requireStaff, requireAdmin, requireSuperAdmin } from '../auth.js';

export * from './types.js';
export * from './requestId.js';
export * from './response.js';
export * from './idempotency.js';
export * from './cache.js';
export * from './cacheService.js';
export * from './controlCenter.js';
export * from './logger.js';
export * from './status.js';
export * from './loadBalancer.js';
export * from './v1Router.js';

/**
 * Attaches the UNX API Gateway pipeline to the Express application
 */
export function setupGateway(app: Express) {
  // 1. Request ID and Client Application Resolution
  app.use(requestIdMiddleware);

  // 2. Load Balancer & Worker Routing Layer
  app.use(loadBalancerMiddleware);

  // 3. Structured Gateway Request Logger
  app.use(gatewayLogger);

  // 4. Dedicated Gateway Status Endpoint (Public Health Status)
  app.get(['/api/gateway/status', '/gateway/status'], getGatewayStatusHandler);

  // 5. Gateway Control Overview (Requires Staff / Admin)
  app.get(
    ['/api/gateway/control/overview', '/gateway/control/overview'],
    authenticateUser,
    requireStaff,
    async (req: Request, res: Response) => {
      try {
        const overview = await controlCenter.getLiveOverview();
        return res.json({ success: true, data: overview, ...overview });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          error: { code: 'GATEWAY_OVERVIEW_ERROR', message: err?.message || 'Failed to retrieve gateway overview' },
        });
      }
    }
  );

  // 6. Gateway API Monitor Telemetry (Requires Staff / Admin)
  app.get(
    ['/api/gateway/control/api-monitor', '/gateway/control/api-monitor'],
    authenticateUser,
    requireStaff,
    (req: Request, res: Response) => {
      try {
        const monitorData = controlCenter.getApiMonitorData();
        return res.json({ success: true, data: monitorData, ...monitorData });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          error: { code: 'API_MONITOR_ERROR', message: err?.message || 'Failed to retrieve API telemetry' },
        });
      }
    }
  );

  // 7. Gateway Cache Metrics (Requires Staff / Admin)
  app.get(
    ['/api/gateway/cache/metrics', '/gateway/cache/metrics', '/api/gateway/cache/stats', '/gateway/cache/stats'],
    authenticateUser,
    requireStaff,
    (req: Request, res: Response) => {
      try {
        const metrics = cacheService.getMetrics();
        return res.json({ success: true, metrics, data: metrics });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          error: { code: 'CACHE_METRICS_ERROR', message: err?.message || 'Failed to retrieve cache metrics' },
        });
      }
    }
  );

  // 8. Gateway Cluster & Worker Status (Requires Staff / Admin)
  app.get(
    ['/api/gateway/cluster/status', '/gateway/cluster/status', '/api/gateway/cluster/stats', '/gateway/cluster/stats'],
    authenticateUser,
    requireStaff,
    (req: Request, res: Response) => {
      try {
        const snapshot = loadBalancer.getSnapshot();
        return res.json({
          success: true,
          mode: snapshot.mode || 'single-instance',
          cluster_available: false,
          cluster_configured: false,
          status: 'HEALTHY',
          snapshot,
          data: snapshot,
          ...snapshot,
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          error: { code: 'CLUSTER_STATUS_ERROR', message: err?.message || 'Failed to retrieve cluster status' },
        });
      }
    }
  );

  // 9. Reset Error Metrics & Telemetry Log (Requires Store Admin / Owner)
  app.post(
    ['/api/gateway/control/clear-errors', '/gateway/control/clear-errors'],
    authenticateUser,
    requireAdmin,
    (_req: Request, res: Response) => {
      try {
        controlCenter.resetMetrics();
        return res.json({ success: true, message: 'Gateway error telemetry cleared successfully.' });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: 'Failed to clear error metrics: ' + err.message });
      }
    }
  );

  // 10. Direct Cache Invalidation & Flush Operations (Requires Admin / SuperAdmin)
  app.post(
    ['/api/gateway/cache/invalidate', '/gateway/cache/invalidate'],
    authenticateUser,
    requireAdmin,
    (req: Request, res: Response) => {
      const { tag, pattern } = req.body || {};
      let count = 0;
      if (tag) {
        count = cacheService.invalidateTag(String(tag));
      } else if (pattern) {
        count = cacheService.invalidatePattern(String(pattern));
      } else {
        return res.status(400).json({ success: false, message: 'Please specify a tag or pattern to invalidate' });
      }
      return res.json({ success: true, invalidatedCount: count, message: `Successfully invalidated ${count} cache entries.` });
    }
  );

  app.post(
    ['/api/gateway/cache/flush', '/gateway/cache/flush'],
    authenticateUser,
    requireAdmin,
    (req: Request, res: Response) => {
      const { confirm } = req.body || {};
      if (!confirm) {
        return res.status(400).json({ success: false, message: 'Confirmation required to flush cache. Send { confirm: true }' });
      }
      cacheService.clear();
      return res.json({ success: true, message: 'All non-critical cache cleared successfully.' });
    }
  );

  // 11. Mount Versioned /api/v1 Router
  app.use('/api/v1', v1Router);
}
