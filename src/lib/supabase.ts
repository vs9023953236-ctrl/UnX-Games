import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://qctpwbrjxkxkpiohzkhw.supabase.co';

function readStoredConfig(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

let currentSupabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL || readStoredConfig('ghn_supabase_url') || DEFAULT_URL;

let currentAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY || readStoredConfig('ghn_supabase_anon_key');

let supabaseInstance: SupabaseClient | null = null;

function buildClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}

// Initial initialization if build keys or cached keys exist
if (currentSupabaseUrl && currentAnonKey) {
  try {
    supabaseInstance = buildClient(currentSupabaseUrl, currentAnonKey);
  } catch (err) {
    console.warn('⚠️ [CLIENT SUPABASE INIT]:', err);
  }
}
export function initClientSupabase(url: string, key: string): SupabaseClient | null {
  if (!url || !key) return null;
  currentSupabaseUrl = url;
  currentAnonKey = key;
  try {
    supabaseInstance = buildClient(url, key);
    return supabaseInstance;
  } catch (err) {
    console.warn('⚠️ [CLIENT SUPABASE DYNAMIC INIT]:', err);
    return null;
  }
}

export function getClientSupabase(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (currentSupabaseUrl && currentAnonKey) {
    supabaseInstance = buildClient(currentSupabaseUrl, currentAnonKey);
    return supabaseInstance;
  }

  return null;
}

let configSyncPromise: Promise<SupabaseClient | null> | null = null;

export async function syncSupabaseConfigFromBackend(): Promise<SupabaseClient | null> {
  const existingClient = getClientSupabase();
  if (existingClient) return existingClient;
  if (typeof window === 'undefined') return null;

  if (!configSyncPromise) {
    configSyncPromise = fetch('/api/public-config', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        const config = payload?.config ?? payload;
        return initClientSupabase(config?.supabaseUrl, config?.supabaseAnonKey);
      })
      .catch(() => null)
      .finally(() => {
        configSyncPromise = null;
      });
  }

  return configSyncPromise;
}

export const isClientSupabaseConfigured = Boolean(currentSupabaseUrl && currentAnonKey);
