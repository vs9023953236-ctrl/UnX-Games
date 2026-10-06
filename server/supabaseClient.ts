import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminClient: SupabaseClient | null = null;
let supabaseAnonClient: SupabaseClient | null = null;

export const DEFAULT_SUPABASE_URL = 'https://qctpwbrjxkxkpiohzkhw.supabase.co';

export function resolveSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('http') ? process.env.DATABASE_URL : '') ||
    DEFAULT_SUPABASE_URL;
  return url.trim().replace(/\/$/, '');
}

export function resolveSupabaseAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();
}

export function resolveSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();
}

/**
 * Returns the privileged Supabase Admin client using the service role key.
 * Used strictly in server-side API routes and background operations.
 * Supports end-user IP address forwarding ('x-forwarded-for') for accurate
 * per-IP rate limiting enabled in the Supabase Dashboard.
 */
export function getSupabaseAdmin(clientIp?: string): SupabaseClient | null {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceRoleKey = resolveSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  // When client IP is provided, forward it via 'x-forwarded-for' header for Supabase Auth IP rate limiting
  if (clientIp && clientIp !== 'unknown') {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-forwarded-for': clientIp,
        },
      },
    });
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

/**
 * Returns the public Supabase client using anon key.
 * Supports end-user IP address forwarding ('x-forwarded-for') for Supabase Auth rate limiting.
 */
export function getSupabaseClient(clientIp?: string): SupabaseClient | null {
  const supabaseUrl = resolveSupabaseUrl();
  const anonKey = resolveSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  if (clientIp && clientIp !== 'unknown') {
    return createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          'x-forwarded-for': clientIp,
        },
      },
    });
  }

  if (!supabaseAnonClient) {
    supabaseAnonClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseAnonClient;
}

/**
 * Creates a fresh, user-scoped Supabase client initialized with a specific user's Bearer access token.
 * Essential for MFA endpoints (enroll, challenge, verify) and RLS user operations.
 */
export function createUserScopedClient(accessToken?: string, clientIp?: string): SupabaseClient | null {
  const supabaseUrl = resolveSupabaseUrl();
  const anonKey = resolveSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (clientIp && clientIp !== 'unknown') {
    headers['x-forwarded-for'] = clientIp;
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: Object.keys(headers).length > 0 ? { headers } : undefined,
  });
}

/**
 * Helper to check whether Supabase is configured in the current environment.
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = resolveSupabaseUrl();
  const key = resolveSupabaseServiceRoleKey() || resolveSupabaseAnonKey();
  return Boolean(supabaseUrl && key);
}
