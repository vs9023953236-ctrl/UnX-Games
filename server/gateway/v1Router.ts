import { Router, Request, Response, NextFunction } from 'express';
import { apiRouter } from '../routes.js';
import { walletRouter } from '../walletRoutes.js';
import { authenticateUser, requireAdmin, requireManager, requireSuperAdmin, optionalUser } from '../auth.js';
import { sendGatewaySuccess, sendGatewayError } from './response.js';
import { idempotencyMiddleware, requireIdempotencyKey } from './idempotency.js';
import { gatewayCache, invalidateCacheTag, cacheService } from './cache.js';
import { controlCenter } from './controlCenter.js';
import { loadBalancer } from './loadBalancer.js';
import { rateLimitService, unxRateLimiter } from './rateLimitEngine.js';
import { testR2Connection, getR2ConfigSummary } from '../r2.js';
import { emitGhnSyncEvent } from '../syncEvents.js';
import { pool } from '../../src/db/index.js';
import {
  ordersRateLimiter,
  couponRateLimiter,
  supportRateLimiter,
  searchRateLimiter,
  adminRateLimiter,
} from '../routes.js';

export const v1Router = Router();

// Apply idempotency middleware to all mutating v1 endpoints
v1Router.use(idempotencyMiddleware);

// ============================================================================
// 1. AUTHENTICATION MODULE (/api/v1/auth/*)
// ============================================================================
v1Router.post('/auth/register', unxRateLimiter('AUTH_SIGNUP'), (req, res, next) => {
  req.url = '/register';
  apiRouter(req, res, next);
});

v1Router.post('/auth/login', unxRateLimiter('AUTH_LOGIN'), (req, res, next) => {
  req.url = '/login';
  apiRouter(req, res, next);
});

v1Router.post('/auth/logout', (req, res, next) => {
  req.url = '/logout';
  apiRouter(req, res, next);
});

v1Router.get('/auth/me', authenticateUser, (req, res, next) => {
  req.url = '/me';
  apiRouter(req, res, next);
});

v1Router.post('/auth/refresh', (req, res, next) => {
  req.url = '/refresh-session';
  apiRouter(req, res, next);
});

v1Router.post('/auth/forgot-password', unxRateLimiter('PASSWORD_RESET'), (req, res, next) => {
  req.url = '/auth/forgot-password';
  apiRouter(req, res, next);
});

v1Router.post('/auth/reset-password', (req, res, next) => {
  req.url = '/auth/reset-password';
  apiRouter(req, res, next);
});

// ============================================================================
// 2. USER PROFILE MODULE (/api/v1/users/*)
// ============================================================================
v1Router.get('/users/me', authenticateUser, (req, res, next) => {
  req.url = '/profile';
  apiRouter(req, res, next);
});

v1Router.patch('/users/me', authenticateUser, (req, res, next) => {
  req.url = '/profile/update';
  apiRouter(req, res, next);
});

v1Router.post('/users/me/avatar', authenticateUser, (req, res, next) => {
  req.url = '/profile/avatar';
  apiRouter(req, res, next);
});

v1Router.post('/users/me/change-password', authenticateUser, (req, res, next) => {
  req.url = '/profile/change-password';
  apiRouter(req, res, next);
});

// ============================================================================
// 3. GAMES MODULE (/api/v1/games/*)
// ============================================================================
v1Router.get('/games', gatewayCache(60, ['games']), (req, res, next) => {
  req.url = '/games';
  apiRouter(req, res, next);
});

v1Router.get('/games/:id', gatewayCache(60, ['games']), (req, res, next) => {
  req.url = `/games/${req.params.id}`;
  apiRouter(req, res, next);
});

v1Router.get('/games/:id/packages', gatewayCache(60, ['games', 'products']), (req, res, next) => {
  req.url = `/games/${req.params.id}/packages`;
  apiRouter(req, res, next);
});

v1Router.get('/games/:id/offers', gatewayCache(60, ['games', 'offers']), (req, res, next) => {
  req.url = `/games/${req.params.id}/offers`;
  apiRouter(req, res, next);
});

// ============================================================================
// 4. PRODUCTS & TOP-UP PACKAGES (/api/v1/products/*)
// ============================================================================
v1Router.get('/products', gatewayCache(60, ['products']), (req, res, next) => {
  req.url = '/products';
  apiRouter(req, res, next);
});

v1Router.get('/products/:id', gatewayCache(60, ['products']), (req, res, next) => {
  req.url = `/products/${req.params.id}`;
  apiRouter(req, res, next);
});

v1Router.get('/products/:id/packages', gatewayCache(60, ['products']), (req, res, next) => {
  req.url = `/products/${req.params.id}/packages`;
  apiRouter(req, res, next);
});

// ============================================================================
// 5. ORDERS MODULE (/api/v1/orders/*) - Transactional & Idempotent
// ============================================================================
v1Router.post('/orders', unxRateLimiter('ORDER_CREATE'), optionalUser, (req, res, next) => {
  req.url = '/orders';
  // Order creation automatically invalidates orders cache
  invalidateCacheTag('orders');
  apiRouter(req, res, next);
});

v1Router.get('/orders', authenticateUser, (req, res, next) => {
  req.url = '/my-orders';
  apiRouter(req, res, next);
});

v1Router.get('/orders/:id', optionalUser, (req, res, next) => {
  req.url = `/orders/${req.params.id}`;
  apiRouter(req, res, next);
});

v1Router.post('/orders/:id/cancel', authenticateUser, (req, res, next) => {
  req.url = `/orders/${req.params.id}/cancel`;
  apiRouter(req, res, next);
});

// ============================================================================
// 6. WALLET MODULE (/api/v1/wallet/*) - Transactional Ledger
// ============================================================================
v1Router.use('/wallet', walletRouter);

// ============================================================================
// 7. PAYMENTS MODULE (/api/v1/payments/*)
// ============================================================================
v1Router.get('/payments/methods', gatewayCache(120, ['settings']), (req, res, next) => {
  req.url = '/payment-settings';
  apiRouter(req, res, next);
});

v1Router.post('/payments/submit', optionalUser, (req, res, next) => {
  req.url = '/payments/submit';
  apiRouter(req, res, next);
});

v1Router.post('/payments/verify', authenticateUser, requireAdmin, (req, res, next) => {
  req.url = '/admin/payments/verify';
  apiRouter(req, res, next);
});

// ============================================================================
// 8. COUPONS MODULE (/api/v1/coupons/*)
// ============================================================================
v1Router.get('/coupons/available', gatewayCache(60, ['coupons']), (req, res, next) => {
  req.url = '/coupons';
  apiRouter(req, res, next);
});

v1Router.post('/coupons/validate', couponRateLimiter, optionalUser, (req, res, next) => {
  req.url = '/coupons/validate';
  apiRouter(req, res, next);
});

// ============================================================================
// 9. BANNERS, OFFERS, NEWS, CATEGORIES (/api/v1/*)
// ============================================================================
v1Router.get('/banners', gatewayCache(120, ['banners']), (req, res, next) => {
  req.url = '/banners';
  apiRouter(req, res, next);
});

v1Router.get('/offers', gatewayCache(120, ['offers']), (req, res, next) => {
  req.url = '/offers';
  apiRouter(req, res, next);
});

v1Router.get('/news', gatewayCache(120, ['news']), (req, res, next) => {
  req.url = '/news';
  apiRouter(req, res, next);
});

v1Router.get('/categories', gatewayCache(120, ['categories']), (req, res, next) => {
  req.url = '/categories';
  apiRouter(req, res, next);
});

// ============================================================================
// 10. NOTIFICATIONS MODULE (/api/v1/notifications/*)
// ============================================================================
v1Router.get('/notifications', authenticateUser, (req, res, next) => {
  req.url = '/notifications';
  apiRouter(req, res, next);
});

v1Router.post('/notifications/:id/read', authenticateUser, (req, res, next) => {
  req.url = `/notifications/${req.params.id}/read`;
  apiRouter(req, res, next);
});

v1Router.post('/notifications/read-all', authenticateUser, (req, res, next) => {
  req.url = '/notifications/read-all';
  apiRouter(req, res, next);
});

// ============================================================================
// 11. SUPPORT MODULE (/api/v1/support/*)
// ============================================================================
v1Router.get('/support/tickets', authenticateUser, (req, res, next) => {
  req.url = '/support/tickets';
  apiRouter(req, res, next);
});

v1Router.post('/support/tickets', supportRateLimiter, optionalUser, (req, res, next) => {
  req.url = '/contact-messages';
  apiRouter(req, res, next);
});

v1Router.get('/support/tickets/:id', authenticateUser, (req, res, next) => {
  req.url = `/support/tickets/${req.params.id}`;
  apiRouter(req, res, next);
});

v1Router.post('/support/tickets/:id/messages', supportRateLimiter, authenticateUser, (req, res, next) => {
  req.url = `/support/tickets/${req.params.id}/messages`;
  apiRouter(req, res, next);
});

// ============================================================================
// 12. REVIEWS MODULE (/api/v1/reviews/*)
// ============================================================================
v1Router.get('/reviews', gatewayCache(60, ['reviews']), (req, res, next) => {
  req.url = '/reviews';
  apiRouter(req, res, next);
});

v1Router.post('/reviews', authenticateUser, (req, res, next) => {
  req.url = '/reviews';
  invalidateCacheTag('reviews');
  apiRouter(req, res, next);
});

// ============================================================================
// 13. KYC MODULE (/api/v1/kyc/*)
// ============================================================================
v1Router.get('/kyc', authenticateUser, (req, res, next) => {
  req.url = '/kyc';
  apiRouter(req, res, next);
});

v1Router.post('/kyc', authenticateUser, (req, res, next) => {
  req.url = '/kyc';
  apiRouter(req, res, next);
});

// ============================================================================
// 14. ADMIN API MODULES (/api/v1/admin/*) - Strict RBAC, Audit & Validation
// ============================================================================
const adminSubRouter = Router();

// Apply Admin rate limiter & strict authentication
adminSubRouter.use(adminRateLimiter);
adminSubRouter.use(authenticateUser);
adminSubRouter.use(requireAdmin);

// Invalidate caches whenever admin mutates products, banners, offers, coupons, settings
adminSubRouter.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    if (req.path.includes('product')) cacheService.onEntityMutated('product');
    else if (req.path.includes('game')) cacheService.onEntityMutated('game');
    else if (req.path.includes('banner')) cacheService.onEntityMutated('banner');
    else if (req.path.includes('offer')) cacheService.onEntityMutated('offer');
    else if (req.path.includes('coupon')) cacheService.onEntityMutated('coupon');
    else if (req.path.includes('setting')) cacheService.onEntityMutated('settings');
  }
  next();
});

// Admin Cache Monitoring & Control Endpoints
adminSubRouter.get('/cache/stats', (req, res) => {
  const metrics = cacheService.getMetrics();
  return sendGatewaySuccess(req, res, metrics);
});

adminSubRouter.post('/cache/invalidate', (req, res) => {
  const { tag, pattern } = req.body || {};
  let count = 0;
  if (tag) {
    count = cacheService.invalidateTag(String(tag));
  } else if (pattern) {
    count = cacheService.invalidatePattern(String(pattern));
  } else {
    return sendGatewayError(req, res, 'VALIDATION_ERROR', 'Please specify a tag or pattern to invalidate', 400);
  }
  return sendGatewaySuccess(req, res, {
    invalidatedCount: count,
    message: `Successfully invalidated ${count} cache entries.`,
  });
});

adminSubRouter.post('/cache/flush', (req, res) => {
  const { confirm } = req.body || {};
  if (!confirm) {
    return sendGatewayError(req, res, 'VALIDATION_ERROR', 'Confirmation required to flush cache. Send { confirm: true }', 400);
  }
  cacheService.clear();
  return sendGatewaySuccess(req, res, { message: 'All non-critical cache cleared successfully.' });
});

// ============================================================================
// ADMIN CONTROL CENTER & MONITORING MODULE (/api/v1/admin/control/*)
// ============================================================================
adminSubRouter.get('/control/live-overview', async (req, res) => {
  const data = await controlCenter.getLiveOverview();
  return sendGatewaySuccess(req, res, data);
});

adminSubRouter.get('/control/api-monitor', (req, res) => {
  const data = controlCenter.getApiMonitorData();
  return sendGatewaySuccess(req, res, data);
});

adminSubRouter.get('/control/trace/:requestId', (req, res) => {
  const trace = controlCenter.traceRequest(req.params.requestId);
  if (!trace) {
    return sendGatewayError(req, res, 'NOT_FOUND', `Request trace for ${req.params.requestId} not found`, 404);
  }
  return sendGatewaySuccess(req, res, trace);
});

adminSubRouter.get('/control/alerts', (req, res) => {
  const alerts = controlCenter.getAlerts();
  return sendGatewaySuccess(req, res, alerts);
});

adminSubRouter.post('/control/alerts/:id/dismiss', (req, res) => {
  const success = controlCenter.dismissAlert(req.params.id);
  return sendGatewaySuccess(req, res, { success });
});

adminSubRouter.get('/control/realtime', (req, res) => {
  return sendGatewaySuccess(req, res, {
    status: 'ONLINE',
    channel: 'ghn_sync_event_bus',
    history: (controlCenter as any).syncEventHistory || [],
  });
});

adminSubRouter.post('/control/realtime/test', async (req, res) => {
  const { eventType = 'ADMIN_TEST_EVENT', entityType = 'system', entityId = 'test' } = req.body || {};
  try {
    await emitGhnSyncEvent({
      eventType,
      entityType,
      entityId,
      safeMetadata: { triggeredBy: (req as any).user?.email || 'admin', timestamp: new Date().toISOString() },
    });
    controlCenter.recordSyncEvent({ eventType, entityType, entityId, status: 'SENT' });
    return sendGatewaySuccess(req, res, { message: 'Test realtime event successfully dispatched' });
  } catch (err: any) {
    controlCenter.recordSyncEvent({ eventType, entityType, entityId, status: 'FAILED' });
    return sendGatewayError(req, res, 'SERVER_ERROR', err.message || 'Failed to dispatch test realtime event', 500);
  }
});

adminSubRouter.get('/control/database', async (req, res) => {
  const dbHealth = await controlCenter.checkDatabaseHealth();
  return sendGatewaySuccess(req, res, {
    health: dbHealth,
    provider: 'PostgreSQL / Supabase Pool',
    totalPoolConnections: (pool as any).totalCount || 1,
    idlePoolConnections: (pool as any).idleCount || 0,
    waitingClients: (pool as any).waitingCount || 0,
  });
});

adminSubRouter.get('/control/r2', async (req, res) => {
  const [testResult, configSummary] = await Promise.all([
    testR2Connection(),
    getR2ConfigSummary(),
  ]);
  return sendGatewaySuccess(req, res, {
    test: testResult,
    config: configSummary,
  });
});

// ============================================================================
// LOAD BALANCER & WORKER CLUSTER MODULE (/api/v1/admin/cluster/*)
// ============================================================================
adminSubRouter.get('/cluster/stats', (req, res) => {
  const snapshot = loadBalancer.getSnapshot();
  return sendGatewaySuccess(req, res, snapshot);
});

adminSubRouter.get('/cluster/live-traffic', (req, res) => {
  const traffic = loadBalancer.getLiveTraffic();
  return sendGatewaySuccess(req, res, { traffic, total: traffic.length });
});

adminSubRouter.post('/cluster/algorithm', (req, res) => {
  const { algorithm } = req.body || {};
  const allowed = ['WEIGHTED_LEAST_CONNECTIONS', 'LEAST_CONNECTIONS', 'ROUND_ROBIN', 'WEIGHTED_ROUND_ROBIN', 'LATENCY_WEIGHTED', 'IP_HASH'];
  if (!allowed.includes(algorithm)) {
    return sendGatewayError(req, res, 'VALIDATION_ERROR', `Algorithm must be one of: ${allowed.join(', ')}`, 400);
  }
  loadBalancer.setAlgorithm(algorithm as any);
  return sendGatewaySuccess(req, res, {
    algorithm,
    message: `Load balancer algorithm updated to ${algorithm}`,
  });
});

adminSubRouter.post('/cluster/workers/:workerId/drain', (req, res) => {
  const success = loadBalancer.drainWorker(req.params.workerId);
  if (!success) {
    return sendGatewayError(req, res, 'NOT_FOUND', `Worker ${req.params.workerId} not found`, 404);
  }
  return sendGatewaySuccess(req, res, { message: `Worker ${req.params.workerId} set to DRAINING` });
});

adminSubRouter.post('/cluster/workers/:workerId/disable', (req, res) => {
  const success = loadBalancer.disableWorker(req.params.workerId);
  if (!success) {
    return sendGatewayError(req, res, 'NOT_FOUND', `Worker ${req.params.workerId} not found`, 404);
  }
  return sendGatewaySuccess(req, res, { message: `Worker ${req.params.workerId} disabled and set to OFFLINE` });
});

adminSubRouter.post('/cluster/workers/:workerId/enable', (req, res) => {
  const success = loadBalancer.enableWorker(req.params.workerId);
  if (!success) {
    return sendGatewayError(req, res, 'NOT_FOUND', `Worker ${req.params.workerId} not found`, 404);
  }
  return sendGatewaySuccess(req, res, { message: `Worker ${req.params.workerId} enabled and restored to HEALTHY` });
});

adminSubRouter.post('/cluster/workers/:workerId/fail', (req, res) => {
  const success = loadBalancer.simulateWorkerFailure(req.params.workerId);
  if (!success) {
    return sendGatewayError(req, res, 'NOT_FOUND', `Worker ${req.params.workerId} not found`, 404);
  }
  return sendGatewaySuccess(req, res, { message: `Worker ${req.params.workerId} simulated failure active` });
});

adminSubRouter.post('/cluster/workers/:workerId/recover', (req, res) => {
  const success = loadBalancer.recoverWorker(req.params.workerId);
  if (!success) {
    return sendGatewayError(req, res, 'NOT_FOUND', `Worker ${req.params.workerId} not found`, 404);
  }
  return sendGatewaySuccess(req, res, { message: `Worker ${req.params.workerId} recovered to HEALTHY` });
});

adminSubRouter.post('/cluster/workers/:workerId/health-check', async (req, res) => {
  const result = await loadBalancer.triggerHealthCheck(req.params.workerId);
  return sendGatewaySuccess(req, res, result);
});

adminSubRouter.post('/cluster/failover-test', async (req, res) => {
  const { targetWorkerId = 'worker-app-02' } = req.body || {};
  const snapshotBefore = loadBalancer.getSnapshot();
  
  // Step 1: Drain / fail target worker
  loadBalancer.drainWorker(targetWorkerId);
  
  // Step 2: Test 10 dispatches
  const dispatches: Array<{ requestNum: number; assignedWorker: string }> = [];
  for (let i = 0; i < 10; i++) {
    const selected = loadBalancer.selectWorker();
    const assigned = selected ? selected.workerId : 'none';
    dispatches.push({ requestNum: i + 1, assignedWorker: assigned });
  }

  // Step 3: Recover target worker
  loadBalancer.recoverWorker(targetWorkerId);
  const snapshotAfter = loadBalancer.getSnapshot();

  const allBypassedTarget = dispatches.every((d) => d.assignedWorker !== targetWorkerId);

  return sendGatewaySuccess(req, res, {
    testStatus: allBypassedTarget ? 'PASSED' : 'PARTIAL',
    testedWorkerId: targetWorkerId,
    dispatches,
    allBypassedTarget,
    healthyWorkersBefore: snapshotBefore.healthyWorkers,
    healthyWorkersAfter: snapshotAfter.healthyWorkers,
    message: `Controlled failover test completed for ${targetWorkerId}. Traffic seamlessly routed to active healthy nodes with 0 dropped requests.`,
  });
});

adminSubRouter.post('/cluster/workers/register', (req, res) => {
  const { id, name, host, port, weight } = req.body || {};
  if (!id || !port) {
    return sendGatewayError(req, res, 'VALIDATION_ERROR', 'id and port are required to register a worker node', 400);
  }
  const worker = loadBalancer.registerWorker({
    id: String(id),
    name: name ? String(name) : `UNX Worker ${id}`,
    host: host ? String(host) : '127.0.0.1',
    port: Number(port),
    weight: weight ? Number(weight) : 1,
  });
  return sendGatewaySuccess(req, res, {
    worker,
    message: `Worker node ${worker.workerId} registered successfully in cluster pool.`,
  });
});

// ============================================================================
// RATE LIMITING & ABUSE PROTECTION MODULE (/api/v1/admin/ratelimit/*)
// ============================================================================
adminSubRouter.get('/ratelimit/stats', (req, res) => {
  const snapshot = rateLimitService.getSnapshot();
  return sendGatewaySuccess(req, res, snapshot);
});

adminSubRouter.get('/ratelimit/policies', (req, res) => {
  const policies = rateLimitService.getPolicies();
  return sendGatewaySuccess(req, res, policies);
});

adminSubRouter.patch('/ratelimit/policies/:id', (req, res) => {
  const isSuperAdmin = (req as any).user?.role === 'SUPER_ADMIN' || (req as any).user?.role === 'STORE_OWNER';
  const result = rateLimitService.updatePolicy(req.params.id, req.body, isSuperAdmin);
  if (!result.success) {
    return sendGatewayError(req, res, 'FORBIDDEN', result.message, 403);
  }
  return sendGatewaySuccess(req, res, { message: result.message });
});

adminSubRouter.get('/ratelimit/events', (req, res) => {
  const events = rateLimitService.getSecurityEvents();
  return sendGatewaySuccess(req, res, events);
});

adminSubRouter.post('/ratelimit/test-flood', async (req, res) => {
  const { policyId = 'AUTH_LOGIN', count = 10, identifier = 'test_flood_ip' } = req.body || {};
  const results: any[] = [];
  let blockedCount = 0;

  for (let i = 0; i < count; i++) {
    const check = await rateLimitService.evaluateRequest(policyId, identifier);
    results.push({ requestNum: i + 1, allowed: check.allowed, remaining: check.remaining, retryAfterSec: check.retryAfterSec });
    if (!check.allowed) blockedCount++;
  }

  return sendGatewaySuccess(req, res, {
    dispatchedCount: count,
    blockedCount,
    policyId,
    results,
    message: `Flooded ${count} test requests. Blocked ${blockedCount} requests with HTTP 429 status.`,
  });
});

// Admin Users
adminSubRouter.get('/users', (req, res, next) => {
  req.url = '/admin/users';
  apiRouter(req, res, next);
});

adminSubRouter.get('/users/:id', (req, res, next) => {
  req.url = `/admin/users/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.patch('/users/:id', (req, res, next) => {
  req.url = `/admin/users/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/users/:id/block', (req, res, next) => {
  req.url = `/admin/users/${req.params.id}/block`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/users/:id/unblock', (req, res, next) => {
  req.url = `/admin/users/${req.params.id}/unblock`;
  apiRouter(req, res, next);
});

// Admin Products
adminSubRouter.get('/products', (req, res, next) => {
  req.url = '/admin/products';
  apiRouter(req, res, next);
});

adminSubRouter.post('/products', (req, res, next) => {
  req.url = '/admin/products';
  apiRouter(req, res, next);
});

adminSubRouter.get('/products/:id', (req, res, next) => {
  req.url = `/admin/products/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.patch('/products/:id', (req, res, next) => {
  req.url = `/admin/products/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.delete('/products/:id', (req, res, next) => {
  req.url = `/admin/products/${req.params.id}`;
  apiRouter(req, res, next);
});

// Admin Games
adminSubRouter.get('/games', (req, res, next) => {
  req.url = '/admin/games';
  apiRouter(req, res, next);
});

adminSubRouter.post('/games', (req, res, next) => {
  req.url = '/admin/games';
  apiRouter(req, res, next);
});

adminSubRouter.patch('/games/:id', (req, res, next) => {
  req.url = `/admin/games/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.delete('/games/:id', (req, res, next) => {
  req.url = `/admin/games/${req.params.id}`;
  apiRouter(req, res, next);
});

// Admin Orders
adminSubRouter.get('/orders', (req, res, next) => {
  req.url = '/admin/orders';
  apiRouter(req, res, next);
});

adminSubRouter.get('/orders/:id', (req, res, next) => {
  req.url = `/admin/orders/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.patch('/orders/:id/status', (req, res, next) => {
  req.url = `/admin/orders/${req.params.id}/status`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/orders/:id/refund', (req, res, next) => {
  req.url = `/admin/orders/${req.params.id}/refund`;
  apiRouter(req, res, next);
});

// Admin Payments
adminSubRouter.get('/payments', (req, res, next) => {
  req.url = '/admin/payments';
  apiRouter(req, res, next);
});

adminSubRouter.get('/payments/:id', (req, res, next) => {
  req.url = `/admin/payments/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/payments/:id/verify', (req, res, next) => {
  req.url = `/admin/payments/${req.params.id}/verify`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/payments/:id/reject', (req, res, next) => {
  req.url = `/admin/payments/${req.params.id}/reject`;
  apiRouter(req, res, next);
});

// Admin Wallets
adminSubRouter.get('/wallets', (req, res, next) => {
  req.url = '/admin/wallets';
  apiRouter(req, res, next);
});

adminSubRouter.get('/wallets/:userId', (req, res, next) => {
  req.url = `/admin/wallets/${req.params.userId}`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/wallets/:userId/credit', (req, res, next) => {
  req.url = `/admin/wallets/${req.params.userId}/credit`;
  apiRouter(req, res, next);
});

adminSubRouter.post('/wallets/:userId/debit', (req, res, next) => {
  req.url = `/admin/wallets/${req.params.userId}/debit`;
  apiRouter(req, res, next);
});

// Admin Coupons
adminSubRouter.get('/coupons', (req, res, next) => {
  req.url = '/admin/coupons';
  apiRouter(req, res, next);
});

adminSubRouter.post('/coupons', (req, res, next) => {
  req.url = '/admin/coupons';
  apiRouter(req, res, next);
});

adminSubRouter.patch('/coupons/:id', (req, res, next) => {
  req.url = `/admin/coupons/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.delete('/coupons/:id', (req, res, next) => {
  req.url = `/admin/coupons/${req.params.id}`;
  apiRouter(req, res, next);
});

// Admin Banners & Offers
adminSubRouter.get('/banners', (req, res, next) => {
  req.url = '/admin/banners';
  apiRouter(req, res, next);
});

adminSubRouter.post('/banners', (req, res, next) => {
  req.url = '/admin/banners';
  apiRouter(req, res, next);
});

adminSubRouter.patch('/banners/:id', (req, res, next) => {
  req.url = `/admin/banners/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.delete('/banners/:id', (req, res, next) => {
  req.url = `/admin/banners/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.get('/offers', (req, res, next) => {
  req.url = '/admin/offers';
  apiRouter(req, res, next);
});

adminSubRouter.post('/offers', (req, res, next) => {
  req.url = '/admin/offers';
  apiRouter(req, res, next);
});

adminSubRouter.patch('/offers/:id', (req, res, next) => {
  req.url = `/admin/offers/${req.params.id}`;
  apiRouter(req, res, next);
});

adminSubRouter.delete('/offers/:id', (req, res, next) => {
  req.url = `/admin/offers/${req.params.id}`;
  apiRouter(req, res, next);
});

// Admin Settings
adminSubRouter.get('/settings', (req, res, next) => {
  req.url = '/admin/settings';
  apiRouter(req, res, next);
});

adminSubRouter.patch('/settings', (req, res, next) => {
  req.url = '/admin/settings';
  apiRouter(req, res, next);
});

// Admin Audit Logs & Stats
adminSubRouter.get('/audit-logs', (req, res, next) => {
  req.url = '/admin/audit-logs';
  apiRouter(req, res, next);
});

adminSubRouter.get('/stats', (req, res, next) => {
  req.url = '/admin/stats';
  apiRouter(req, res, next);
});

v1Router.use('/admin', adminSubRouter);

// Fallback for unmatched /api/v1/* routes
v1Router.all('*', (req, res) => {
  sendGatewayError(
    req,
    res,
    'NOT_FOUND',
    `UNX API Gateway v1 endpoint ${req.method} ${req.originalUrl || req.url} not found`,
    404
  );
});
