import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadBalancer } from '../../../server/gateway/loadBalancer.js';

describe('UNX Games - Production Load Balancer, Real Worker Registry & Reverse Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure all workers are recovered and clean
    loadBalancer.recoverWorker('worker-core-01');
    loadBalancer.recoverWorker('worker-app-02');
    loadBalancer.recoverWorker('worker-app-03');
    loadBalancer.setAlgorithm('WEIGHTED_LEAST_CONNECTIONS');
  });

  describe('1. Worker Discovery & Registry', () => {
    it('registers cluster workers with valid runtime health metrics', () => {
      const snapshot = loadBalancer.getSnapshot();
      expect(snapshot.workers.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.healthyWorkers).toBeGreaterThanOrEqual(3);
      expect(snapshot.unhealthyWorkers).toBe(0);

      const core = snapshot.workers.find((w) => w.workerId === 'worker-core-01');
      expect(core).toBeDefined();
      expect(core?.status).toBe('HEALTHY');
      expect(core?.port).toBe(3000);
      expect(core?.type).toBe('REAL');
    });

    it('accurately computes zero-downtime support status', () => {
      const snapshot = loadBalancer.getSnapshot();
      expect(snapshot.zeroDowntimeSupported).toBe(true);
      expect(snapshot.zeroDowntimeStatus).toContain('High Availability');
    });
  });

  describe('2. Weighted Least-Connections Distribution (Primary Algorithm)', () => {
    it('routes traffic to the worker with the lowest active connections / weight score', () => {
      loadBalancer.setAlgorithm('WEIGHTED_LEAST_CONNECTIONS');

      // Artificially simulate active connections on worker-core-01 and worker-app-02
      loadBalancer.recordRequestStart('worker-core-01');
      loadBalancer.recordRequestStart('worker-core-01');
      loadBalancer.recordRequestStart('worker-app-02');

      // worker-app-03 has 0 active connections -> should be selected
      const selected = loadBalancer.selectWorker();
      expect(selected?.workerId).toBe('worker-app-03');

      // Clean up connections
      loadBalancer.recordRequestEnd('worker-core-01', 10, 200);
      loadBalancer.recordRequestEnd('worker-core-01', 10, 200);
      loadBalancer.recordRequestEnd('worker-app-02', 10, 200);
    });
  });

  describe('3. Round-Robin & Weighted Round-Robin Distribution', () => {
    it('cyclically distributes incoming traffic across healthy workers', () => {
      loadBalancer.setAlgorithm('ROUND_ROBIN');

      const assignedWorkers: string[] = [];
      for (let i = 0; i < 6; i++) {
        const selected = loadBalancer.selectWorker();
        expect(selected).not.toBeNull();
        assignedWorkers.push(selected!.workerId);
      }

      // Verify cyclic rotation occurred across worker-core-01, worker-app-02, worker-app-03
      expect(assignedWorkers.includes('worker-core-01')).toBe(true);
      expect(assignedWorkers.includes('worker-app-02')).toBe(true);
      expect(assignedWorkers.includes('worker-app-03')).toBe(true);
    });

    it('distributes traffic by IP hash for sticky sessions', () => {
      loadBalancer.setAlgorithm('IP_HASH');
      const ip1 = '192.168.1.100';
      const ip2 = '10.0.0.50';

      const sel1A = loadBalancer.selectWorker(ip1);
      const sel1B = loadBalancer.selectWorker(ip1);
      expect(sel1A?.workerId).toBe(sel1B?.workerId);

      const sel2A = loadBalancer.selectWorker(ip2);
      const sel2B = loadBalancer.selectWorker(ip2);
      expect(sel2A?.workerId).toBe(sel2B?.workerId);
    });
  });

  describe('4. Automatic Failover & Recovery', () => {
    it('immediately bypasses failed worker and routes to remaining healthy nodes', () => {
      // Simulate failure of worker-app-02
      loadBalancer.simulateWorkerFailure('worker-app-02');

      const snapshot = loadBalancer.getSnapshot();
      const worker2 = snapshot.workers.find((w) => w.workerId === 'worker-app-02');
      expect(worker2?.status).toBe('OFFLINE');
      expect(snapshot.healthyWorkers).toBe(2);
      expect(snapshot.unhealthyWorkers).toBe(1);

      // Subsequent 10 selections must NEVER pick worker-app-02
      for (let i = 0; i < 10; i++) {
        const selected = loadBalancer.selectWorker();
        expect(selected?.workerId).not.toBe('worker-app-02');
        expect(['worker-core-01', 'worker-app-03']).toContain(selected?.workerId);
      }
    });

    it('restores recovered worker back to healthy rotation after recovery threshold', () => {
      loadBalancer.simulateWorkerFailure('worker-app-02');
      expect(loadBalancer.getSnapshot().unhealthyWorkers).toBe(1);

      // Recover worker-app-02
      const recovered = loadBalancer.recoverWorker('worker-app-02');
      expect(recovered).toBe(true);

      const snapshot = loadBalancer.getSnapshot();
      expect(snapshot.healthyWorkers).toBe(3);

      const worker2 = snapshot.workers.find((w) => w.workerId === 'worker-app-02');
      expect(worker2?.status).toBe('HEALTHY');
    });
  });

  describe('5. Real Connection Draining', () => {
    it('sets worker state to DRAINING and prevents new traffic while allowing completion', () => {
      loadBalancer.recordRequestStart('worker-app-03');
      
      const drained = loadBalancer.drainWorker('worker-app-03');
      expect(drained).toBe(true);

      const snapshot = loadBalancer.getSnapshot();
      const worker3 = snapshot.workers.find((w) => w.workerId === 'worker-app-03');
      expect(worker3?.status).toBe('DRAINING');
      expect(worker3?.draining).toBe(true);

      // New selections MUST NOT pick draining worker-app-03
      for (let i = 0; i < 10; i++) {
        const selected = loadBalancer.selectWorker();
        expect(selected?.workerId).not.toBe('worker-app-03');
      }

      // Finish active connection
      loadBalancer.recordRequestEnd('worker-app-03', 15, 200);
      expect(worker3?.activeConnections).toBe(0);
    });
  });

  describe('6. Real Health Checks', () => {
    it('executes active health check probe and updates lastHealthCheck timestamp', async () => {
      const res = await loadBalancer.triggerHealthCheck('worker-core-01');
      expect(res.success).toBe(true);
      expect(res.status).toBe('HEALTHY');

      const snapshot = loadBalancer.getSnapshot();
      const core = snapshot.workers.find((w) => w.workerId === 'worker-core-01');
      expect(core?.consecutiveFailures).toBe(0);
      expect(core?.lastHealthCheck).toBeDefined();
    });
  });

  describe('7. Circuit Breaker Safeguards', () => {
    it('trips circuit breaker to OPEN after consecutive failures and resets upon success', () => {
      const cbName = 'supabase_db';

      // 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        loadBalancer.recordCircuitFailure(cbName);
      }

      const circuit = loadBalancer.getCircuitBreakers().find((c) => c.name === 'Supabase Database');
      expect(circuit?.state).toBe('OPEN');

      // Reset upon success
      loadBalancer.recordCircuitSuccess(cbName);
      expect(circuit?.failureCount).toBe(0);
    });
  });

  describe('8. Real Telemetry & Latency Calculation', () => {
    it('records real latency percentiles and live traffic stream', () => {
      loadBalancer.recordRequestStart('worker-core-01');
      loadBalancer.recordRequestEnd('worker-core-01', 25, 200, {
        method: 'GET',
        path: '/api/v1/games',
        clientIp: '127.0.0.1',
        requestId: 'req_test_123',
      });

      const traffic = loadBalancer.getLiveTraffic();
      expect(traffic.length).toBeGreaterThan(0);
      expect(traffic[0].path).toBe('/api/v1/games');
      expect(traffic[0].workerId).toBe('worker-core-01');
      expect(traffic[0].statusCode).toBe(200);
    });
  });
});
