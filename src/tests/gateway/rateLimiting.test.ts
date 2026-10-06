import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimitService } from '../../../server/gateway/rateLimitEngine.js';

describe('UNX Games - API Rate Limiting & Abuse Protection Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitService.reset();
  });

  describe('1. Fixed Window Algorithm', () => {
    it('allows requests up to configured limit and blocks subsequent requests with Retry-After', async () => {
      const testKey = `test_fw_${Date.now()}`;
      const limit = 3;
      const windowMs = 5000;

      // 3 requests allowed
      for (let i = 1; i <= 3; i++) {
        const res = await rateLimitService.checkFixedWindow(testKey, limit, windowMs);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(limit - i);
      }

      // 4th request must be blocked
      const blocked = await rateLimitService.checkFixedWindow(testKey, limit, windowMs);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(blocked.algorithm).toBe('FIXED_WINDOW');
    });
  });

  describe('2. Sliding Window Algorithm', () => {
    it('evaluates rolling time window without edge boundary spikes', async () => {
      const testKey = `test_sw_${Date.now()}`;
      const limit = 4;
      const windowMs = 2000;

      // 4 requests allowed
      for (let i = 1; i <= 4; i++) {
        const res = await rateLimitService.checkSlidingWindow(testKey, limit, windowMs);
        expect(res.allowed).toBe(true);
      }

      // 5th request blocked
      const blocked = await rateLimitService.checkSlidingWindow(testKey, limit, windowMs);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(blocked.algorithm).toBe('SLIDING_WINDOW');
    });
  });

  describe('3. Token Bucket Algorithm', () => {
    it('allows burst up to bucket capacity and refills tokens over time', async () => {
      const testKey = `test_tb_${Date.now()}`;
      const capacity = 5;
      const refillRate = 2; // 2 tokens/sec
      const cost = 1;

      // Consume full bucket capacity
      for (let i = 0; i < capacity; i++) {
        const res = await rateLimitService.checkTokenBucket(testKey, capacity, refillRate, cost);
        expect(res.allowed).toBe(true);
      }

      // Exhausted bucket -> blocked
      const blocked = await rateLimitService.checkTokenBucket(testKey, capacity, refillRate, cost);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(blocked.algorithm).toBe('TOKEN_BUCKET');
    });
  });

  describe('4. Leaky Bucket Algorithm', () => {
    it('smooths traffic bursts and rejects overflow requests', () => {
      const testKey = `test_lb_${Date.now()}`;
      const capacity = 3;
      const leakRate = 1; // 1 req/sec

      // Send 3 requests to fill the bucket
      for (let i = 0; i < capacity; i++) {
        const res = rateLimitService.checkLeakyBucket(testKey, capacity, leakRate);
        expect(res.allowed).toBe(true);
      }

      // 4th request overflows the leaky bucket
      const overflow = rateLimitService.checkLeakyBucket(testKey, capacity, leakRate);
      expect(overflow.allowed).toBe(false);
      expect(overflow.retryAfterSec).toBeGreaterThan(0);
      expect(overflow.algorithm).toBe('LEAKY_BUCKET');
    });
  });

  describe('5. Policy Management & Safety Protection', () => {
    it('allows updating policy parameters and prevents regular admins from disabling critical endpoints', () => {
      const policyId = 'AUTH_LOGIN';

      // Update algorithm & limit
      const updateRes = rateLimitService.updatePolicy(policyId, {
        algorithm: 'TOKEN_BUCKET',
        limit: 8,
      }, true);
      expect(updateRes.success).toBe(true);

      const policy = rateLimitService.getPolicy(policyId);
      expect(policy?.algorithm).toBe('TOKEN_BUCKET');
      expect(policy?.limit).toBe(8);

      // Attempt to disable critical policy without Super Admin privileges
      const forbiddenDisable = rateLimitService.updatePolicy(policyId, { enabled: false }, false);
      expect(forbiddenDisable.success).toBe(false);
      expect(forbiddenDisable.message).toContain('Super Admin privileges');

      // Super Admin can disable
      const allowedDisable = rateLimitService.updatePolicy(policyId, { enabled: false }, true);
      expect(allowedDisable.success).toBe(true);

      // Re-enable
      rateLimitService.updatePolicy(policyId, { enabled: true }, true);
    });
  });

  describe('6. Security Events & Abuse Detection', () => {
    it('logs security events and surfaces telemetry in snapshot', () => {
      rateLimitService.recordSecurityEvent({
        type: 'LOGIN_BRUTE_FORCE',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        identifier: 'attacker@example.com',
        ip: '198.51.100.1',
        requestId: 'unx_req_sec_test',
        retryAfterSec: 45,
      });

      const events = rateLimitService.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);

      const latest = events[0];
      expect(latest.type).toBe('LOGIN_BRUTE_FORCE');
      expect(latest.identifier).toBe('attacker@example.com');
      expect(latest.retryAfterSec).toBe(45);

      const snapshot = rateLimitService.getSnapshot();
      expect(snapshot).toHaveProperty('totalRequests');
      expect(snapshot).toHaveProperty('policies');
      expect(snapshot.policies.length).toBeGreaterThan(0);
    });
  });
});
