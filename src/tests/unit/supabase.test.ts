import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('isClientSupabaseConfigured', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem('ghn_supabase_url');
    localStorage.removeItem('ghn_supabase_anon_key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should be true when URL and ANON_KEY are present in env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    const { isClientSupabaseConfigured } = await import('../../lib/supabase');
    expect(isClientSupabaseConfigured).toBe(true);
  });

  it('should be false when URL is missing (fallback to default, so if ANON_KEY is missing it fails)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    delete process.env.SUPABASE_ANON_KEY;
    const { isClientSupabaseConfigured } = await import('../../lib/supabase');
    expect(isClientSupabaseConfigured).toBe(false);
  });

  it('should be false when ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    delete process.env.SUPABASE_ANON_KEY;
    const { isClientSupabaseConfigured } = await import('../../lib/supabase');
    expect(isClientSupabaseConfigured).toBe(false);
  });

  it('should fallback to localStorage if env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    localStorage.setItem('ghn_supabase_url', 'http://local-storage');
    localStorage.setItem('ghn_supabase_anon_key', 'local-anon-key');

    const { isClientSupabaseConfigured } = await import('../../lib/supabase');
    expect(isClientSupabaseConfigured).toBe(true);
  });
});
