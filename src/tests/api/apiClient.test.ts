import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, fetchApi } from '../../services/api';
import * as supabaseLib from '../../lib/supabase';

describe('API Client (fetchApi) & Error Contract Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles successful 200 API responses cleanly', async () => {
    const mockData = { success: true, products: [{ id: 'p1', name: 'Free Fire 100 Diamonds' }] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as any);

    const res = await fetchApi('/api/products');
    expect(res.success).toBe(true);
    expect(res.products).toHaveLength(1);
    expect(res.products?.[0].name).toBe('Free Fire 100 Diamonds');
    expect(res.status).toBe(200);
  });

  it('sends admin activity entries to the protected audit endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true }),
    } as any);

    const activity = {
      action: 'Updated store settings',
      targetType: 'app_settings',
      targetId: 'main',
      description: 'Changed the public announcement.',
    };
    const result = await api.admin.logActivity(activity);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/activity-logs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(activity),
      })
    );
  });

  it('handles 403 Forbidden with clear access denied message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ success: false }),
    } as any);

    const res = await fetchApi('/api/admin/restricted');
    expect(res.success).toBe(false);
    expect(res.status).toBe(403);
    expect(res.message).toContain('Access Denied');
  });

  it('handles 429 Rate Limit with rateLimited flag and retry message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ success: false, retryAfter: 30 }),
    } as any);

    const res = await fetchApi('/api/auth/login');
    expect(res.success).toBe(false);
    expect(res.status).toBe(429);
    expect(res.rateLimited).toBe(true);
    expect(res.message).toContain('30 seconds');
  });

  it('distinguishes real server error (500) without silently converting to empty array or 0', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false, message: 'Database connection timeout' }),
    } as any);

    const res = await fetchApi('/api/orders');
    expect(res.success).toBe(false);
    expect(res.status).toBe(500);
    expect(res.message).toBe('Database connection timeout');
    // Ensure it NEVER silently returns empty data
    expect(res.orders).toBeUndefined();
  });

  it('handles network disconnection / fetch rejection gracefully as an error response', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network request failed'));

    const res = await fetchApi('/api/wallet/balance');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Network request failed');
    // Balance must NOT be silently falsified to 0
    expect(res.balance).toBeUndefined();
  });

  it('attaches Supabase Bearer token when active session exists', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-supabase-access-token-12345',
        },
      },
    });

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        refreshSession: vi.fn(),
      },
    } as any);

    let capturedHeaders: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    });

    await fetchApi('/api/user/profile');
    expect(capturedHeaders?.Authorization).toBe('Bearer mock-supabase-access-token-12345');
  });

  it('handles invalid server response when both json() and text() fail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => { throw new Error('JSON parse error'); },
      text: async () => { throw new Error('Text parse error'); },
    } as any);

    const res = await fetchApi('/api/bad-endpoint');
    expect(res.success).toBe(false);
    expect(res.status).toBe(502);
    expect(res.message).toContain('Invalid server response');
  });
});
