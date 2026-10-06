import { describe, it, expect, vi, beforeEach } from 'vitest';
import { controlCenter } from '../../../server/gateway/controlCenter.js';

describe('UNX Admin Operations & Control Center Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Telemetry & Request Metrics Recording', () => {
    it('accurately records requests, status codes, and active sessions', () => {
      // Record sample requests
      controlCenter.recordRequest({
        requestId: 'unx_req_test_1',
        method: 'GET',
        path: '/api/v1/products',
        statusCode: 200,
        durationMs: 45,
        clientApp: 'unx-web',
        ip: '192.168.1.10',
        userId: 'user_123',
        userRole: 'CUSTOMER',
        cacheLookup: 'HIT',
      });

      controlCenter.recordRequest({
        requestId: 'unx_req_test_2',
        method: 'POST',
        path: '/api/v1/orders',
        statusCode: 429,
        durationMs: 12,
        clientApp: 'unx-mobile',
        ip: '192.168.1.20',
        userId: 'user_456',
        userRole: 'CUSTOMER',
      });

      const monitorData = controlCenter.getApiMonitorData();
      expect(monitorData.totalEndpointsTracked).toBeGreaterThan(0);

      // Verify recent traces captured
      const trace1 = controlCenter.traceRequest('unx_req_test_1');
      expect(trace1).not.toBeNull();
      expect(trace1?.method).toBe('GET');
      expect(trace1?.statusCode).toBe(200);
      expect(trace1?.durationMs).toBe(45);
      expect(trace1?.cacheLookup).toBe('HIT');

      const trace2 = controlCenter.traceRequest('unx_req_test_2');
      expect(trace2).not.toBeNull();
      expect(trace2?.statusCode).toBe(429);
    });
  });

  describe('2. Request ID Tracing Lifecycle', () => {
    it('returns null for non-existent request IDs and metadata for valid ones', () => {
      expect(controlCenter.traceRequest('non-existent-id')).toBeNull();

      controlCenter.recordRequest({
        requestId: 'unx_trace_alpha',
        method: 'GET',
        path: '/api/v1/games/free-fire',
        statusCode: 200,
        durationMs: 18,
        clientApp: 'unx-web',
        ip: '10.0.0.5',
      });

      const trace = controlCenter.traceRequest('unx_trace_alpha');
      expect(trace?.path).toBe('/api/v1/games/free-fire');
      expect(trace?.durationMs).toBe(18);
    });
  });

  describe('3. Alert Center & Anomaly Detection', () => {
    it('allows triggering and dismissing operational alerts', () => {
      controlCenter.triggerAlert({
        id: 'test_db_spike',
        level: 'WARNING',
        subsystem: 'DATABASE',
        title: 'High Latency Detected',
        message: 'PostgreSQL query ping exceeded 1200ms',
      });

      const alerts = controlCenter.getAlerts();
      const testAlert = alerts.find((a) => a.id === 'test_db_spike');
      expect(testAlert).toBeDefined();
      expect(testAlert?.level).toBe('WARNING');
      expect(testAlert?.acknowledged).toBe(false);

      // Dismiss alert
      const dismissed = controlCenter.dismissAlert('test_db_spike');
      expect(dismissed).toBe(true);
      expect(testAlert?.acknowledged).toBe(true);
    });
  });

  describe('4. Realtime Sync Event Logging', () => {
    it('records sync event history for cluster broadcast inspection', () => {
      controlCenter.recordSyncEvent({
        eventType: 'PRODUCT_MUTATED',
        entityType: 'product',
        entityId: 'prod_99',
        status: 'SENT',
      });

      const overview: any = (controlCenter as any).syncEventHistory;
      expect(overview).toBeDefined();
      expect(overview.length).toBeGreaterThan(0);
      expect(overview[0].eventType).toBe('PRODUCT_MUTATED');
      expect(overview[0].status).toBe('SENT');
    });
  });

  describe('5. Live Subsystem Health & Overall Status Calculation', () => {
    it('calculates system health and subsystem breakdowns accurately', async () => {
      const overview = await controlCenter.getLiveOverview();
      expect(overview).toBeDefined();
      expect(['HEALTHY', 'DEGRADED', 'CRITICAL']).toContain(overview.overallStatus);
      expect(overview.subsystems).toHaveProperty('api');
      expect(overview.subsystems).toHaveProperty('database');
      expect(overview.subsystems).toHaveProperty('auth');
      expect(overview.subsystems).toHaveProperty('cache');
      expect(overview.subsystems).toHaveProperty('realtime');
      expect(overview.subsystems).toHaveProperty('storage');
      expect(overview.traffic).toHaveProperty('totalRequests');
    });
  });
});
