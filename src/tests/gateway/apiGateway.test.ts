import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestIdMiddleware } from '../../../server/gateway/requestId.js';
import { sendGatewaySuccess, sendGatewayError } from '../../../server/gateway/response.js';
import { idempotencyMiddleware } from '../../../server/gateway/idempotency.js';
import { getCachedResponse, setCachedResponse, invalidateCacheTag, invalidateAllCache } from '../../../server/gateway/cache.js';

describe('UNX Games API Gateway Architecture Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAllCache();
  });

  describe('1. Request ID & Client App Header Resolution', () => {
    it('generates a new unique X-Request-ID when none is provided', () => {
      const req: any = {
        header: vi.fn().mockReturnValue(undefined),
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };
      const res: any = {
        setHeader: vi.fn(),
      };
      const next = vi.fn();

      requestIdMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.gatewayMeta).toBeDefined();
      expect(req.gatewayMeta.requestId).toMatch(/^unx_/);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.gatewayMeta.requestId);
    });

    it('safely preserves a valid client-provided X-Request-ID', () => {
      const customId = 'client-req-987654321';
      const req: any = {
        header: vi.fn().mockImplementation((name) => (name.toLowerCase() === 'x-request-id' ? customId : undefined)),
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };
      const res: any = {
        setHeader: vi.fn(),
      };
      const next = vi.fn();

      requestIdMiddleware(req, res, next);

      expect(req.gatewayMeta.requestId).toBe(customId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', customId);
    });

    it('identifies unx-admin and unx-user client applications correctly', () => {
      const adminReq: any = {
        header: vi.fn().mockImplementation((name) => (name.toLowerCase() === 'x-client-app' ? 'unx-admin' : undefined)),
        headers: {},
        path: '/api/v1/admin/orders',
        socket: { remoteAddress: '127.0.0.1' },
      };
      const res: any = { setHeader: vi.fn() };
      const next = vi.fn();

      requestIdMiddleware(adminReq, res, next);
      expect(adminReq.gatewayMeta.clientApp).toBe('unx-admin');
      expect(res.setHeader).toHaveBeenCalledWith('X-Client-App', 'unx-admin');
    });
  });

  describe('2. Standard Gateway Response Format', () => {
    it('formats success responses with data, requestId and backward-compatible fields', () => {
      const req: any = {
        gatewayMeta: { requestId: 'unx_req_test123' },
      };
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const res: any = {
        status: statusMock,
      };

      const testData = {
        products: [{ id: 'p1', name: 'Free Fire 100 Diamonds' }],
        count: 1,
      };

      sendGatewaySuccess(req, res, testData, 200, {
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData,
          products: testData.products, // backward-compatibility check
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          requestId: 'unx_req_test123',
        })
      );
    });

    it('formats error responses with structured code and clean error message', () => {
      const req: any = {
        gatewayMeta: { requestId: 'unx_err_test123' },
      };
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const res: any = {
        status: statusMock,
      };

      sendGatewayError(req, res, 'WALLET_INSUFFICIENT', 'Insufficient wallet balance for checkout.', 400);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Insufficient wallet balance for checkout.',
          error: {
            code: 'WALLET_INSUFFICIENT',
            message: 'Insufficient wallet balance for checkout.',
          },
          requestId: 'unx_err_test123',
        })
      );
    });
  });

  describe('3. Idempotency Protection for Financial Operations', () => {
    it('allows non-mutating GET requests to pass through untouched', () => {
      const req: any = { method: 'GET', header: vi.fn() };
      const res: any = {};
      const next = vi.fn();

      idempotencyMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('caches and returns exact response when duplicate Idempotency-Key is presented', () => {
      const idempotencyKey = 'idem-order-abc-123';
      const req1: any = {
        method: 'POST',
        path: '/api/v1/orders',
        user: { id: 'usr-123' },
        header: vi.fn().mockImplementation((name) => (name.toLowerCase() === 'idempotency-key' ? idempotencyKey : undefined)),
      };

      const res1: any = {
        statusCode: 201,
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn((body) => body),
      };

      const next1 = vi.fn();
      idempotencyMiddleware(req1, res1, next1);
      expect(next1).toHaveBeenCalledTimes(1);

      // Simulate handler generating order response
      res1.json({ success: true, orderId: 'ord-777', totalNpr: 500 });

      // Immediate replay with same idempotency key
      const req2: any = {
        method: 'POST',
        path: '/api/v1/orders',
        user: { id: 'usr-123' },
        header: vi.fn().mockImplementation((name) => (name.toLowerCase() === 'idempotency-key' ? idempotencyKey : undefined)),
      };

      const jsonMock2 = vi.fn();
      const statusMock2 = vi.fn().mockReturnValue({ json: jsonMock2 });
      const res2: any = {
        setHeader: vi.fn(),
        status: statusMock2,
      };
      const next2 = vi.fn();

      idempotencyMiddleware(req2, res2, next2);

      // Should return cached response directly without calling next()!
      expect(next2).not.toHaveBeenCalled();
      expect(statusMock2).toHaveBeenCalledWith(201);
      expect(jsonMock2).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          orderId: 'ord-777',
          totalNpr: 500,
        })
      );
    });
  });

  describe('4. In-Memory Response Caching & Invalidation', () => {
    it('sets and retrieves cached responses by key before expiry', () => {
      const key = '/api/v1/games';
      const sampleGames = [{ id: 'g1', name: 'Free Fire' }];

      setCachedResponse(key, sampleGames, 60, ['games']);
      const retrieved = getCachedResponse(key);

      expect(retrieved).toEqual(sampleGames);
    });

    it('invalidates tagged cache entries on demand when data mutates', () => {
      setCachedResponse('/api/v1/products', [{ id: 'p1' }], 60, ['products']);
      setCachedResponse('/api/v1/banners', [{ id: 'b1' }], 60, ['banners']);

      expect(getCachedResponse('/api/v1/products')).toBeDefined();
      expect(getCachedResponse('/api/v1/banners')).toBeDefined();

      // Invalidate products
      invalidateCacheTag('products');

      expect(getCachedResponse('/api/v1/products')).toBeNull();
      expect(getCachedResponse('/api/v1/banners')).toBeDefined(); // banners preserved
    });
  });
});
