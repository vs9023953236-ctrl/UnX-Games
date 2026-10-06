// Unx Games API Client with Cookie & Supabase Auth Credentials
import { getClientSupabase, syncSupabaseConfigFromBackend } from '../lib/supabase';

let inMemoryAuthToken: string | null = null;
let supabaseAuthListenerInitialized = false;

function initSupabaseAuthListener() {
  if (supabaseAuthListenerInitialized || typeof window === 'undefined') return;
  const sb = getClientSupabase();
  if (sb) {
    try {
      sb.auth.onAuthStateChange((_event, session) => {
        const token = session?.access_token || null;
        setApiAuthToken(token);
      });
      supabaseAuthListenerInitialized = true;
    } catch {}
  } else {
    // Attempt backend sync in background
    syncSupabaseConfigFromBackend().then((dynClient) => {
      if (dynClient && !supabaseAuthListenerInitialized) {
        try {
          dynClient.auth.onAuthStateChange((_event, session) => {
            const token = session?.access_token || null;
            setApiAuthToken(token);
          });
          supabaseAuthListenerInitialized = true;
        } catch {}
      }
    }).catch(() => {});
  }
}

export function setApiAuthToken(token: string | null) {
  inMemoryAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      try {
        localStorage.setItem('ghn_auth_token', token);
        sessionStorage.setItem('ghn_auth_token', token);
      } catch {}
    } else {
      try {
        localStorage.removeItem('ghn_auth_token');
        sessionStorage.removeItem('ghn_auth_token');
      } catch {}
    }
  }
}

export function getApiAuthToken(): string | null {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('ghn_auth_token') || localStorage.getItem('ghn_auth_token');
      if (stored) {
        inMemoryAuthToken = stored;
        return stored;
      }
      // Check Supabase storage keys in localStorage (e.g. sb-*-auth-token)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token')) && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const tok = parsed?.access_token || parsed?.session?.access_token;
              if (tok) {
                inMemoryAuthToken = tok;
                return tok;
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  return null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  user?: any;
  users?: any[];
  token?: string;
  products?: any[];
  product?: any;
  orders?: any[];
  order?: any;
  cancellations?: any[];
  cancellation?: any;
  paymentSettings?: any;
  appSettings?: any;
  banners?: any[];
  banner?: any;
  news?: any[];
  reviews?: any[];
  notifications?: any[];
  stats?: any;
  logs?: any[];
  [key: string]: any;
}

// In-flight GET request deduplication map to eliminate duplicate concurrent network queries
const inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET' && !options.body;

  if (isGet) {
    const dedupeKey = `${endpoint}`;
    if (inFlightRequests.has(dedupeKey)) {
      return inFlightRequests.get(dedupeKey)!;
    }

    const promise = executeFetchApi<T>(endpoint, options, retries).finally(() => {
      inFlightRequests.delete(dedupeKey);
    });

    inFlightRequests.set(dedupeKey, promise);
    return promise;
  }

  return executeFetchApi<T>(endpoint, options, retries);
}

async function fallbackSupabaseQuery<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T> | null> {
  const sb = getClientSupabase();
  if (!sb) return null;

  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') return null;

  const cleanEndpoint = endpoint.replace(/^\/api/, '').split('?')[0];

  try {
    if (cleanEndpoint === '/products') {
      const { data, error } = await sb.from('products').select('*').order('slot_number', { ascending: true });
      if (!error && data) return { success: true, products: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/categories') {
      const { data, error } = await sb.from('categories').select('*').order('display_order', { ascending: true });
      if (!error && data) return { success: true, categories: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/games') {
      const { data, error } = await sb.from('games').select('*').order('display_order', { ascending: true });
      if (!error && data) return { success: true, games: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/banners') {
      const { data, error } = await sb.from('banners').select('*').eq('active', true).order('display_order', { ascending: true });
      if (!error && data) return { success: true, banners: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/news') {
      const { data, error } = await sb.from('news').select('*').eq('active', true).order('created_at', { ascending: false });
      if (!error && data) return { success: true, news: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/reviews') {
      const { data, error } = await sb.from('reviews').select('*').eq('status', 'APPROVED').order('created_at', { ascending: false });
      if (!error && data) return { success: true, reviews: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/settings' || cleanEndpoint === '/settings/app') {
      const { data, error } = await sb.from('app_settings').select('*').limit(1);
      if (!error && data && data.length > 0) return { success: true, appSettings: data[0], settings: data[0] } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/settings/payment' || cleanEndpoint === '/payment-settings') {
      const { data, error } = await sb.from('payment_settings').select('*').limit(1);
      if (!error && data && data.length > 0) return { success: true, paymentSettings: data[0] } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/orders/my-orders' || cleanEndpoint === '/orders') {
      const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return { success: true, orders: data } as ApiResponse<T>;
    }
    if (cleanEndpoint === '/notifications') {
      const { data, error } = await sb.from('notifications').select('*').order('created_at', { ascending: false });
      if (!error && data) return { success: true, notifications: data } as ApiResponse<T>;
    }
  } catch (fbErr) {
    console.warn('Supabase direct fallback notice:', fbErr);
  }
  return null;
}

async function executeFetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1
): Promise<ApiResponse<T>> {
  initSupabaseAuthListener();
  let token: string | null = getApiAuthToken();
  let sb = getClientSupabase();
  
  if (!token && !sb && endpoint !== '/api/public-config' && !endpoint.includes('public-config')) {
    sb = await syncSupabaseConfigFromBackend().catch(() => null);
  }
  
  if (!token && sb) {
    try {
      const { data } = await sb.auth.getSession();
      if (data?.session?.access_token) {
        token = data.session.access_token;
        setApiAuthToken(token);
      }
    } catch {}
  }

  const clientApp =
    typeof window !== 'undefined' && window.location.pathname.includes('/admin')
      ? 'unx-admin'
      : 'unx-web';

  const reqId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `unx_${crypto.randomUUID()}`
      : `unx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-App': clientApp,
    'X-Request-ID': reqId,
    ...(token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const baseUrl = import.meta.env.VITE_API_URL || '';
  let normalizedEndpoint = endpoint;
  if (!normalizedEndpoint.startsWith('http')) {
    if (!normalizedEndpoint.startsWith('/')) {
      normalizedEndpoint = `/${normalizedEndpoint}`;
    }
    // Prevent accidental missing /api prefix for backend routes
    if (normalizedEndpoint.startsWith('/admin/') || normalizedEndpoint.startsWith('/gateway/') || normalizedEndpoint.startsWith('/auth/') || normalizedEndpoint.startsWith('/v1/')) {
      normalizedEndpoint = `/api${normalizedEndpoint}`;
    }
  }
  const fullUrl = normalizedEndpoint.startsWith('http') ? normalizedEndpoint : `${baseUrl}${normalizedEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include', // Includes http-only cookie
    });

    const data = await response.json().catch(async () => {
      const txt = await response.text().catch(() => '');
      return {
        success: false,
        message: `HTTP ${response.status}: ${txt.slice(0, 150) || 'Invalid server response'}`,
      };
    });

    data.status = response.status;

    if (data?.token && typeof data.token === 'string') {
      setApiAuthToken(data.token);
    }

    if (!response.ok && data.success === undefined) {
      data.success = false;
    }

    if (response.status === 403) {
      data.success = false;
      if (!data.message || data.message.includes('HTTP 403')) {
        data.message = 'Access Denied: Elevated administrative permission required.';
      }
    }

    if (response.status === 429) {
      data.success = false;
      data.rateLimited = true;
      if (!data.message || data.message.includes('HTTP 429') || data.message.includes('Server response error')) {
        if (data.retryAfter && typeof data.retryAfter === 'number') {
          data.message = `Please wait ${data.retryAfter} seconds before trying again.`;
        } else {
          data.message = 'Too many attempts. Please wait a moment and try again.';
        }
      }
    }

    if (response.status === 401) {
      if (retries > 0 && sb) {
        try {
          const { data: sessData } = await sb.auth.getSession();
          if (sessData?.session?.access_token && sessData.session.access_token !== token) {
            setApiAuthToken(sessData.session.access_token);
            return executeFetchApi<T>(endpoint, options, retries - 1);
          }

          const { data: refreshData } = await sb.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            setApiAuthToken(refreshData.session.access_token);
            return executeFetchApi<T>(endpoint, options, retries - 1);
          }
        } catch (rErr) {
          console.warn('Session refresh failed on 401:', rErr);
        }
      }
    }

    if (!response.ok) {
      const fb = await fallbackSupabaseQuery<T>(endpoint, options);
      if (fb) return fb;
    }

    return data;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        success: false,
        message: 'Request aborted',
      };
    }

    const fb = await fallbackSupabaseQuery<T>(endpoint, options);
    if (fb) return fb;
    
    // Auto retry once for GET requests on transient network hiccups
    const method = (options.method || 'GET').toUpperCase();
    if (retries > 0 && method === 'GET') {
      await new Promise((r) => setTimeout(r, 400));
      return executeFetchApi<T>(endpoint, options, retries - 1);
    }

    console.warn(`API request notice for ${endpoint}:`, err.message || err);
    return {
      success: false,
      message: err.message || 'Network error connecting to backend service.',
    };
  }
}

export const api = {
  // Authentication
  auth: {
    syncCustomer: (customerData: {
      auth_user_id?: string;
      supabase_auth_user_id?: string;
      email: string;
      full_name?: string;
      mobile?: string;
      username?: string;
      location?: string;
      address?: string;
      district?: string;
      city?: string;
    }) =>
      fetchApi('/api/auth/sync-customer', {
        method: 'POST',
        body: JSON.stringify(customerData),
      }),
    completeInvitationSetup: (setupData: {
      password: string;
      full_name?: string;
      mobile?: string;
      username?: string;
    }) =>
      fetchApi('/api/auth/complete-invitation-setup', {
        method: 'POST',
        body: JSON.stringify(setupData),
      }),
    ensureCustomer: (customerData: {
      email: string;
      full_name?: string;
      mobile?: string;
      username?: string;
      avatar_url?: string;
    }) =>
      fetchApi('/api/customers/ensure', {
        method: 'POST',
        body: JSON.stringify(customerData),
      }),
    register: (userData: any) =>
      fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    sendSignupOtp: (data: {
      email: string;
      full_name?: string;
      mobile?: string;
      username?: string;
      password?: string;
    }) =>
      fetchApi('/api/auth/send-signup-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifySignupOtp: (data: {
      email: string;
      otp_code: string;
      password?: string;
      full_name?: string;
      mobile?: string;
      username?: string;
    }) =>
      fetchApi('/api/auth/verify-signup-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendResetOtp: (identifier: string) =>
      fetchApi('/api/auth/send-reset-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      }),
    verifyResetOtp: (data: {
      identifier: string;
      otp_code: string;
      newPassword: string;
    }) =>
      fetchApi('/api/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (credentials: { email: string; password?: string; pin?: string; login_type?: string }) =>
      fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    deleteAccount: (confirmation: string) =>
      fetchApi('/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmation }),
      }),
    adminLogin: (credentials: { email: string; password?: string }) =>
      fetchApi('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    loginWithPin: (credentials: { email: string; pin: string }) =>
      fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...credentials, login_type: 'pin' }),
      }),
    verifyPin: (credentials: { pin: string }) =>
      fetchApi('/api/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    setSecurityPin: (pin: string, old_pin?: string) =>
      fetchApi<{ success: boolean; message?: string; user?: any }>('/api/auth/set-security-pin', {
        method: 'POST',
        body: JSON.stringify({ pin, new_pin: pin, old_pin }),
      }),
    getMfaStatus: () =>
      fetchApi('/api/auth/mfa/status'),
    enrollMfa: () =>
      fetchApi<{
        success: boolean;
        factorId?: string;
        qrCodeSvg?: string;
        secret?: string;
        uri?: string;
        sessionToken?: string;
        message?: string;
      }>('/api/auth/mfa/enroll', {
        method: 'POST',
      }),
    verifyMfaEnrollment: (data: { factorId: string; code: string }) =>
      fetchApi<{
        success: boolean;
        message?: string;
        user?: any;
      }>('/api/auth/mfa/verify-enroll', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unenrollMfa: (factorId?: string) =>
      fetchApi('/api/auth/mfa/unenroll', {
        method: 'POST',
        body: JSON.stringify({ factorId }),
      }),
    verify2FA: (data: { email: string; otp: string; factorId?: string }) =>
      fetchApi('/api/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    saveAccountSetup: (data: {
      step?: number;
      full_name?: string;
      username?: string;
      gamer_id?: string;
      mobile?: string;
      avatar_url?: string;
      favorite_games?: string[];
      notification_preferences?: any;
      security_pin?: string;
      completed?: boolean;
      two_factor_enabled?: boolean;
      location?: string;
      address?: string;
      district?: string;
      city?: string;
      game_uids?: Record<string, string>;
    }) =>
      fetchApi('/api/auth/account-setup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: async () => {
      return fetchApi('/api/auth/logout', { method: 'POST' });
    },
    me: () => fetchApi('/api/auth/me'),
    updateProfile: (profile: any) =>
      fetchApi('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      fetchApi('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    requestPasswordReset: (data: { identifier: string; newPassword: string }) =>
      fetchApi('/api/auth/forgot-password-request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    checkResetRequest: (identifier: string) =>
      fetchApi(`/api/auth/check-reset-request?identifier=${encodeURIComponent(identifier)}`),
  },

  // Admin Password Reset Approvals
  passwordResets: {
    getAll: () => fetchApi('/api/admin/password-resets'),
    approve: (id: string) =>
      fetchApi(`/api/admin/password-resets/${id}/approve`, {
        method: 'POST',
      }),
    reject: (id: string, reason?: string) =>
      fetchApi(`/api/admin/password-resets/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // Products
  products: {
    getAll: () => fetchApi('/api/products'),
    create: (product: any) =>
      fetchApi('/api/products', {
        method: 'POST',
        body: JSON.stringify(product),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchApi(`/api/products/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categories
  categories: {
    getAll: () => fetchApi('/api/categories'),
    create: (category: any) =>
      fetchApi('/api/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchApi(`/api/categories/${id}`, {
        method: 'DELETE',
      }),
  },

  // Games
  games: {
    getAll: () => fetchApi('/api/games'),
    getById: (id: string) => fetchApi(`/api/games/${id}`),
    create: (game: any) =>
      fetchApi('/api/games', {
        method: 'POST',
        body: JSON.stringify(game),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/games/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchApi(`/api/games/${id}`, {
        method: 'DELETE',
      }),
  },

  // Orders
  orders: {
    getAll: () => fetchApi('/api/orders'),
    getMyOrders: () => fetchApi('/api/orders/my-orders'),
    getById: (id: string) => fetchApi(`/api/orders/${id}`),
    track: (orderNumber: string) => fetchApi(`/api/orders/track/${encodeURIComponent(orderNumber)}`),
    publicLookup: (data: { orderCode?: string; playerId?: string; email?: string }) =>
      fetchApi('/api/orders/public-lookup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getHistory: (id: string) => fetchApi(`/api/orders/${id}/history`),
    create: (orderData: any) =>
      fetchApi('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      }),
    updateStatus: (
      id: string,
      status: string,
      adminNote?: string,
      rejectionReason?: string,
      extraData?: any,
      adminInfo?: any
    ) =>
      fetchApi(`/api/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNote, rejectionReason, extraData, adminInfo }),
      }),
    resubmitPayment: (
      id: string,
      data: {
        transactionId: string;
        paymentScreenshot?: string;
        paymentScreenshotR2Key?: string;
        paymentMethod?: string;
        resubmitNote?: string;
      }
    ) =>
      fetchApi(`/api/orders/${id}/resubmit-payment`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/api/orders/${id}`, {
        method: 'DELETE',
      }),
    bulkDelete: (orderIds: string[]) =>
      fetchApi('/api/orders/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ orderIds }),
      }),
    clearAll: () =>
      fetchApi('/api/orders', {
        method: 'DELETE',
      }),
  },

  // Customer Management (Admin)
  customers: {
    getAll: (params?: { q?: string; status?: string; role?: string }) => {
      const query = new URLSearchParams();
      if (params?.q) query.append('q', params.q);
      if (params?.status) query.append('status', params.status);
      if (params?.role) query.append('role', params.role);
      const qs = query.toString();
      return fetchApi(`/api/admin/customers${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => fetchApi(`/api/admin/customers/${id}`),
    create: (userData: any) =>
      fetchApi('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/admin/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    updateRole: (id: string, role: string) =>
      fetchApi(`/api/admin/users/${id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
    block: (id: string, reason?: string) =>
      fetchApi(`/api/admin/customers/${id}/block`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    unblock: (id: string) =>
      fetchApi(`/api/admin/customers/${id}/unblock`, {
        method: 'POST',
      }),
    suspend: (id: string, reason?: string) =>
      fetchApi(`/api/admin/customers/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    reset2FA: (id: string) =>
      fetchApi(`/api/admin/customers/${id}/reset-2fa`, {
        method: 'POST',
      }),
    resetMfa: (id: string) =>
      fetchApi(`/api/admin/customers/${id}/reset-mfa`, {
        method: 'POST',
      }),
    getMfaStatus: (id: string) =>
      fetchApi(`/api/admin/customers/${id}/mfa-status`),
    toggle2FA: (id: string, enabled: boolean) =>
      fetchApi(`/api/admin/customers/${id}/toggle-2fa`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    verifyMobile: (id: string, verified: boolean) =>
      fetchApi(`/api/admin/customers/${id}/verify-mobile`, {
        method: 'POST',
        body: JSON.stringify({ verified }),
      }),
  },

  // Payments (Admin)
  payments: {
    getAll: () => fetchApi('/api/admin/payments'),
    verify: (id: string) =>
      fetchApi(`/api/admin/payments/${id}/verify`, {
        method: 'PUT',
      }),
    delete: (id: string) =>
      fetchApi(`/api/admin/payments/${id}`, {
        method: 'DELETE',
      }),
    clearAll: () =>
      fetchApi('/api/admin/payments', {
        method: 'DELETE',
      }),
  },

  // Cancellations & Refunds
  cancellations: {
    getAll: () => fetchApi('/api/cancellations'),
    create: (data: { orderId: string; reason: string; note?: string; refundDetails?: any }) =>
      fetchApi('/api/cancellations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (id: string, adminNote?: string) =>
      fetchApi(`/api/cancellations/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ adminNote }),
      }),
    reject: (id: string, reason: string, adminNote?: string) =>
      fetchApi(`/api/cancellations/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason, adminNote }),
      }),
    refund: (id: string, refundData: any) =>
      fetchApi(`/api/cancellations/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify(refundData),
      }),
  },

  // Settings
  settings: {
    getPaymentSettings: () => fetchApi('/api/payment-settings'),
    updatePaymentSettings: (settings: any) =>
      fetchApi('/api/payment-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    getAppSettings: () => fetchApi('/api/settings'),
    updateAppSettings: (settings: any) =>
      fetchApi('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    getStoreStatus: () => fetchApi('/api/settings/store-status'),
    toggleStoreStatus: (data: {
      isOnline?: boolean;
      orderingEnabled?: boolean;
      maintenanceMode?: boolean;
      maintenanceMessage?: string;
      durationMinutes?: number;
      adminInfo?: any;
    }) =>
      fetchApi('/api/settings/store-status', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Offers
  offers: {
    getAll: () => fetchApi('/api/offers'),
    create: (offer: any) => fetchApi('/api/offers', { method: 'POST', body: JSON.stringify(offer) }),
    update: (id: string, updates: any) => fetchApi(`/api/offers/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string) => fetchApi(`/api/offers/${id}`, { method: 'DELETE' }),
  },

  // Banners

  // Coupons
  coupons: {
    getAll: () => fetchApi('/api/coupons'),
    syncAll: () => fetchApi('/api/coupons/sync-active-all', { method: 'POST' }),
    create: (data: any) => fetchApi('/api/coupons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi('/api/coupons/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi('/api/coupons/' + id, { method: 'DELETE' }),
    validate: (data: { code: string; orderAmount?: number; subtotal?: number; productId?: string; categoryId?: string }) =>
      fetchApi('/api/coupons/validate', { method: 'POST', body: JSON.stringify(data) }),
  },

  banners: {
    getAll: () => fetchApi('/api/banners'),
    create: (banner: any) =>
      fetchApi('/api/banners', {
        method: 'POST',
        body: JSON.stringify(banner),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/banners/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchApi(`/api/banners/${id}`, {
        method: 'DELETE',
      }),
  },

  // Storage / Cloudflare R2 Uploads
  storage: {
    getStatus: () => fetchApi('/api/storage/status'),
    testConnection: () =>
      fetchApi('/api/storage/test-connection', {
        method: 'POST',
      }),
    deleteFile: (key: string) =>
      fetchApi('/api/storage/file', {
        method: 'DELETE',
        body: JSON.stringify({ key }),
      }),
    upload: async (file: File | Blob, folder: string = 'general', filename?: string) => {
      const fname = filename || (file as File).name || 'upload.png';
      const contentType = file.type || 'image/png';

      const token = getApiAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'X-Upload-Folder': folder,
        'X-Upload-Filename': encodeURIComponent(fname),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: file,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'File upload failed');
      }
      return data;
    },
  },

  // News
  news: {
    getAll: () => fetchApi('/api/news'),
    create: (newsItem: any) =>
      fetchApi('/api/news', {
        method: 'POST',
        body: JSON.stringify(newsItem),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/news/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchApi(`/api/news/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reviews
  reviews: {
    getAll: () => fetchApi('/api/reviews'),
    create: (review: any) =>
      fetchApi('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(review),
      }),
    update: (id: string, updates: any) =>
      fetchApi(`/api/reviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchApi(`/api/reviews/${id}`, {
        method: 'DELETE',
      }),
    getSettings: () => fetchApi('/api/admin/reviews/settings'),
    updateSettings: (settings: any) =>
      fetchApi('/api/admin/reviews/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    generateAiReply: (id: string, tone?: string) =>
      fetchApi(`/api/admin/reviews/${id}/ai-reply`, {
        method: 'POST',
        body: JSON.stringify({ tone }),
      }),
    previewAiReply: (data: any) =>
      fetchApi('/api/admin/reviews/preview-ai-reply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    autoReplyAll: (tone?: string, overwriteExisting?: boolean) =>
      fetchApi('/api/admin/reviews/auto-reply-all', {
        method: 'POST',
        body: JSON.stringify({ tone, overwriteExisting }),
      }),
  },

  // Unx AI Suite
  ai: {
    assistantChat: (messages: Array<{ role: string; content: string; reasoning_details?: unknown }>, userContext?: any) =>
      fetchApi('/api/ai/assistant-chat', {
        method: 'POST',
        body: JSON.stringify({ messages, userContext }),
      }),
    getAiConfig: () => fetchApi('/api/admin/ai-config'),
    updateAiConfig: (data: { apiKey?: string; model?: string; reasoningEnabled?: boolean }) =>
      fetchApi('/api/admin/ai-config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    verifyReceipt: (data: { imageUrl: string; expectedAmount?: number; expectedOrderCode?: string; paymentMethod?: string }) =>
      fetchApi('/api/ai/verify-receipt', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generateProductContent: (data: { name: string; category?: string; gameName?: string; price?: number; packagesCount?: number; language?: string }) =>
      fetchApi('/api/ai/generate-product-content', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    databaseCopilot: (query: string, contextData?: any) =>
      fetchApi('/api/ai/database-copilot', {
        method: 'POST',
        body: JSON.stringify({ query, contextData }),
      }),
    codeArchitect: (data: { taskType?: string; prompt: string; targetStack?: string; contextSnippet?: string }) =>
      fetchApi('/api/admin/ai/code-architect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getSystemDiagnostics: () => fetchApi('/api/admin/ai/system-diagnostics'),
    runSelfHealing: (actionType: string) =>
      fetchApi('/api/admin/ai/self-healing', {
        method: 'POST',
        body: JSON.stringify({ actionType }),
      }),
    executeSql: (sqlQuery: string) =>
      fetchApi('/api/admin/ai/execute-sql', {
        method: 'POST',
        body: JSON.stringify({ sqlQuery }),
      }),
    getEvolutionStatus: () => fetchApi('/api/admin/evolution/status'),
    triggerEvolutionCycle: () =>
      fetchApi('/api/admin/evolution/trigger-cycle', {
        method: 'POST',
      }),
    updateEvolutionConfig: (data: { isActive?: boolean; cadenceSeconds?: number; currentFocus?: string }) =>
      fetchApi('/api/admin/evolution/config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    omniChat: (messages: Array<{ role: string; content: string; reasoning_details?: unknown }>) =>
      fetchApi('/api/admin/ai/omni-chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      }),
    sendOverseerCommand: (data: { prompt: string; autoExecute?: boolean; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; targetModel?: string; modelOverride?: string }) =>
      fetchApi('/api/admin/ai/command', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getSwarmStatus: () => fetchApi('/api/admin/ai/swarm/status'),
    collaborateSwarm: (data: { task: string; domain?: string; enableSecurityCrossCheck?: boolean }) =>
      fetchApi('/api/admin/ai/swarm/collaborate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggleSwarmModel: (agentId: string, active: boolean) =>
      fetchApi('/api/admin/ai/swarm/toggle-model', {
        method: 'POST',
        body: JSON.stringify({ agentId, active }),
      }),
    getSecuritySweep: () => fetchApi('/api/admin/security/anti-hack-sweep'),
    hardenSecurityDefense: () =>
      fetchApi('/api/admin/security/harden-defense', {
        method: 'POST',
      }),
  },

  // Notifications
  notifications: {
    getAll: () => fetchApi('/api/notifications'),
    markRead: (id: string) =>
      fetchApi(`/api/notifications/${id}/read`, {
        method: 'PUT',
      }),
    markAllRead: () =>
      fetchApi('/api/notifications/read-all', {
        method: 'PUT',
      }),
    send: (data: { title: string; message: string; recipient_uid?: string; recipientUid?: string; recipient_role?: string; recipientRole?: string; is_global?: boolean; isGlobal?: boolean; type?: string; orderId?: string }) =>
      fetchApi('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    aiCompose: (data: { topic: string; tone?: string; targetAudience?: string; game?: string; promoCode?: string; discountPercent?: number }) =>
      fetchApi('/api/admin/notifications/ai-compose', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteOne: (id: string) =>
      fetchApi(`/api/notifications/${id}`, {
        method: 'DELETE',
      }),
    clearUser: () =>
      fetchApi('/api/notifications/clear-all', {
        method: 'DELETE',
      }),
    adminClearAll: () =>
      fetchApi('/api/notifications/admin/clear-all', {
        method: 'DELETE',
      }),
  },

  // Wallet
  wallet: {
    getMyWallet: () => fetchApi('/api/wallet/my-wallet'),
    deposit: (data: { amount: number; paymentMethod: string; reference: string; proofUrl?: string }) =>
      fetchApi('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    payOrder: (orderId: string) =>
      fetchApi('/api/wallet/pay-order', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      }),
    adminGetWallets: () => fetchApi('/api/wallet/admin/list'),
    adminGetTransactions: (params?: { status?: string; type?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.type) query.append('type', params.type);
      if (params?.limit) query.append('limit', String(params.limit));
      const qs = query.toString();
      return fetchApi(`/api/wallet/admin/transactions${qs ? `?${qs}` : ''}`);
    },
    adminVerifyDeposit: (transactionId: string, action: 'approve' | 'reject', notes?: string) =>
      fetchApi(`/api/wallet/admin/verify-deposit/${transactionId}`, {
        method: 'POST',
        body: JSON.stringify({ action, notes }),
      }),
    adminAdjustWallet: (data: { customerId: string; type: 'CREDIT' | 'DEBIT'; amount: number; reason: string }) =>
      fetchApi('/api/wallet/admin/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // User Actions
  user: {
    submitVerification: (data: { docType: string; docNumber: string; notes?: string }) =>
      fetchApi('/api/user/verification-request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  
  // Team Management
  team: {
    apply: (data: any) => 
      fetchApi('/api/team/apply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    leaveRequest: (reason: string) =>
      fetchApi('/api/team/leave-request', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getMyApplication: () =>
      fetchApi('/api/team/my-application'),
    withdrawMyApplication: () =>
      fetchApi('/api/team/my-application/withdraw', {
        method: 'POST',
      }),
    getDashboardStats: () =>
      fetchApi('/api/team/dashboard-stats'),
    getApplications: (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      const qs = q.toString();
      return fetchApi(`/api/team/applications${qs ? `?${qs}` : ''}`);
    },
    getApplicationDetails: (id: string) =>
      fetchApi(`/api/team/applications/${id}`),
    updateApplicationStatus: (id: string, data: { status: string; review_note?: string; stage?: string }) =>
      fetchApi(`/api/team/applications/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    saveApplicationNotes: (id: string, notes: string) =>
      fetchApi(`/api/team/applications/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ internal_notes: notes }),
      }),
    getMembers: () =>
      fetchApi('/api/team/members'),
    updateMemberRole: (id: string, role: string) =>
      fetchApi(`/api/team/members/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    removeMember: (id: string) =>
      fetchApi(`/api/team/members/${id}`, {
        method: 'DELETE',
      }),
    approve: (id: string, note?: string) =>
      fetchApi(`/api/team/applications/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note, review_note: note }),
      }),
    reject: (id: string, reason?: string) =>
      fetchApi(`/api/team/applications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, review_note: reason, rejection_reason: reason }),
      }),
    deleteApplication: (id: string) =>
      fetchApi(`/api/team/applications/${id}`, {
        method: 'DELETE',
      }),
    getOfficers: () =>
      fetchApi('/api/team/officers'),
    getActivityLogs: () =>
      fetchApi('/api/team/activity-logs'),
    getNotifications: () =>
      fetchApi('/api/team/notifications'),
    markNotificationRead: (id: string) =>
      fetchApi(`/api/team/notifications/${id}/read`, {
        method: 'PUT',
      }),
  },

  // Admin Management
  admin: {
    inviteUser: (data: { email: string; full_name?: string; role?: string; redirectTo?: string }) =>
      fetchApi('/api/admin/invite-user', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getInvitations: () => fetchApi('/api/admin/invitations'),
    resendInvitation: (id: string) =>
      fetchApi(`/api/admin/invitations/${id}/resend`, {
        method: 'POST',
      }),
    cancelInvitation: (id: string) =>
      fetchApi(`/api/admin/invitations/${id}/cancel`, {
        method: 'POST',
      }),
    getUsers: () => fetchApi('/api/admin/users'),
    syncUsers: () =>
      fetchApi('/api/admin/users/sync', {
        method: 'POST',
      }),
    updateUser: (uid: string, updates: any) =>
      fetchApi(`/api/admin/users/${uid}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    verifyUserAccount: (uid: string, action: 'approve' | 'reject' | 'reset', rejectionReason?: string) =>
      fetchApi(`/api/admin/users/${uid}/verify-account`, {
        method: 'POST',
        body: JSON.stringify({ action, rejectionReason }),
      }),
    deleteUser: (uid: string, confirmation = 'DELETE ACCOUNT') =>
      fetchApi(`/api/admin/users/${uid}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation }),
      }),
    getStats: () => fetchApi('/api/admin/stats'),
    completeAllPending: () =>
      fetchApi('/api/admin/complete-all-pending', {
        method: 'POST',
      }),
    getActivityLogs: () => fetchApi('/api/admin/activity-logs'),
    logActivity: (activity: {
      action: string;
      targetType?: string;
      targetId?: string;
      description: string;
      adminId?: string;
      adminName?: string;
      adminEmail?: string;
    }) =>
      fetchApi('/api/admin/activity-logs', {
        method: 'POST',
        body: JSON.stringify({
          ...activity,
          targetType: activity.targetType || 'system',
          targetId: activity.targetId || 'main',
        }),
      }),
    getSystemHealth: () => fetchApi('/api/admin/system-health'),
    getSystemData: () => fetchApi('/api/admin/system-data'),
    getDatabaseDiscovery: () => fetchApi('/api/admin/database-discovery'),
    getDataInspector: (table: string, limit = 50, offset = 0) =>
      fetchApi(`/api/admin/data-inspector?table=${encodeURIComponent(table)}&limit=${limit}&offset=${offset}`),
    getDebugJoins: () => fetchApi('/api/admin/debug-joins'),
    getMedia: () => fetchApi('/api/admin/media'),
    deleteMedia: (url: string, key?: string) =>
      fetchApi('/api/admin/media/delete', {
        method: 'POST',
        body: JSON.stringify({ url, key }),
      }),
    bulkDeleteMedia: (items: Array<{ url: string; key?: string }>) =>
      fetchApi('/api/admin/media/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    cleanupUnusedMedia: () =>
      fetchApi('/api/admin/media/cleanup-unused', {
        method: 'POST',
      }),
    purgeDuplicateMedia: () =>
      fetchApi('/api/admin/media/purge-duplicates', {
        method: 'POST',
      }),
    cleanupDummyUsers: () =>
      fetchApi('/api/admin/users/cleanup-dummy', {
        method: 'POST',
      }),
    search: (query: string) =>
      fetchApi(`/api/admin/search?q=${encodeURIComponent(query)}`),
    getDatabaseProjectStatus: () => fetchApi('/api/admin/supabase-project-status'),
    getSupabaseProjectStatus: () => fetchApi('/api/admin/supabase-project-status'),
    getMaintenanceSettings: () => fetchApi('/api/settings'),
    updateMaintenanceSettings: (data: { enabled: boolean; message?: string; duration_minutes?: number | null; durationMinutes?: number | null; until?: string | null; maintenanceUntil?: string | null }) =>
      fetchApi('/api/admin/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPasswordResetRequests: () => fetchApi('/api/admin/password-resets'),
    approvePasswordReset: (id: string) =>
      fetchApi(`/api/admin/password-resets/${id}/approve`, {
        method: 'POST',
      }),
    rejectPasswordReset: (id: string, reason?: string) =>
      fetchApi(`/api/admin/password-resets/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getStorageCounts: () => fetchApi('/api/admin/system/storage-counts'),
    bulkClearRecords: (data: { target?: string; targets?: any; adminInfo?: any }) =>
      fetchApi('/api/admin/system/bulk-clear', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getSentinelScan: () => fetchApi('/api/admin/system/sentinel-scan'),
    runSentinelAutoFix: (actionTypes?: string[]) =>
      fetchApi('/api/admin/system/sentinel-autofix', {
        method: 'POST',
        body: JSON.stringify({ actionTypes }),
      }),
    syncDatabase: () =>
      fetchApi('/api/admin/sync/all', {
        method: 'POST',
      }),
  },

  // System Fetcher Project Intelligence Engine
  systemFetcher: {
    scan: (forceFresh = false) => fetchApi(`/api/admin/system-fetcher/scan${forceFresh ? '?fresh=true' : ''}`),
    recheck: () =>
      fetchApi('/api/admin/system-fetcher/recheck', {
        method: 'POST',
      }),
    history: () => fetchApi('/api/admin/system-fetcher/history'),
    getExportUrl: (format: 'markdown' | 'json' = 'markdown') => `/api/admin/system-fetcher/export?format=${format}`,
  },

  // Customer Support Inquiries (PostgreSQL backed)
  support: {
    submitInquiry: (data: any) =>
      fetchApi('/api/support/inquiries', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMyInquiries: (email?: string) =>
      fetchApi(`/api/support/inquiries${email ? `?email=${encodeURIComponent(email)}` : ''}`),
    getAllInquiries: () =>
      fetchApi('/api/admin/support/inquiries'),
    getTicketMessages: (id: string, email?: string) =>
      fetchApi(`/api/support/inquiries/${id}/messages${email ? `?email=${encodeURIComponent(email)}` : ''}`),
    sendTicketMessage: (id: string, data: { message: string; attachmentUrl?: string; senderName?: string; email?: string }) =>
      fetchApi(`/api/support/inquiries/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    replyInquiry: (id: string, replyMessage: string, newStatus?: string, attachmentUrl?: string) =>
      fetchApi(`/api/admin/support/inquiries/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyMessage, newStatus, attachmentUrl }),
      }),
    updateStatus: (id: string, status: string, priority?: string) =>
      fetchApi(`/api/admin/support/inquiries/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, priority }),
      }),
    deleteInquiry: (id: string) =>
      fetchApi(`/api/admin/support/inquiries/${id}`, {
        method: 'DELETE',
      }),
  },

  // Legal Pages
  legal: {
    getAll: () => fetchApi('/api/legal'),
    getBySlug: (slug: string) => fetchApi(`/api/legal/${slug}`),
    create: (data: { title: string; slug: string; content: string; is_published?: boolean }) =>
      fetchApi('/api/admin/legal', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateBySlug: (slug: string, data: { title?: string; content?: string; is_published?: boolean; version?: string }) =>
      fetchApi(`/api/admin/legal/${slug}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteBySlug: (slug: string) =>
      fetchApi(`/api/admin/legal/${slug}`, {
        method: 'DELETE',
      }),
    resetDefaults: () =>
      fetchApi('/api/admin/legal/reset-defaults', {
        method: 'POST',
      }),
  },
  gateway: {
    getStatus: () => fetchApi('/api/gateway/status'),
    v1: {
      getGames: () => fetchApi('/api/v1/games'),
      getProducts: () => fetchApi('/api/v1/products'),
      getBanners: () => fetchApi('/api/v1/banners'),
      getOffers: () => fetchApi('/api/v1/offers'),
      getCategories: () => fetchApi('/api/v1/categories'),
      getAvailableCoupons: () => fetchApi('/api/v1/coupons/available'),
      createOrder: (data: any, idempotencyKey?: string) =>
        fetchApi('/api/v1/orders', {
          method: 'POST',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
          body: JSON.stringify(data),
        }),
      walletDebit: (data: any, idempotencyKey?: string) =>
        fetchApi('/api/v1/wallet/debit', {
          method: 'POST',
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
          body: JSON.stringify(data),
        }),
    },
    cache: {
      getStats: () => fetchApi('/api/v1/admin/cache/stats'),
      invalidate: (data: { tag?: string; pattern?: string }) =>
        fetchApi('/api/v1/admin/cache/invalidate', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      flush: () =>
        fetchApi('/api/v1/admin/cache/flush', {
          method: 'POST',
          body: JSON.stringify({ confirm: true }),
        }),
    },
    control: {
      getLiveOverview: () => fetchApi('/api/v1/admin/control/live-overview'),
      getApiMonitor: () => fetchApi('/api/v1/admin/control/api-monitor'),
      traceRequest: (requestId: string) => fetchApi(`/api/v1/admin/control/trace/${encodeURIComponent(requestId)}`),
      getAlerts: () => fetchApi('/api/v1/admin/control/alerts'),
      dismissAlert: (id: string) =>
        fetchApi(`/api/v1/admin/control/alerts/${encodeURIComponent(id)}/dismiss`, {
          method: 'POST',
        }),
      getRealtime: () => fetchApi('/api/v1/admin/control/realtime'),
      sendTestRealtime: (data?: any) =>
        fetchApi('/api/v1/admin/control/realtime/test', {
          method: 'POST',
          body: JSON.stringify(data || {}),
        }),
      getDatabase: () => fetchApi('/api/v1/admin/control/database'),
      getR2: () => fetchApi('/api/v1/admin/control/r2'),
    },
    cluster: {
      getStats: () => fetchApi('/api/v1/admin/cluster/stats'),
      getLiveTraffic: () => fetchApi('/api/v1/admin/cluster/live-traffic'),
      setAlgorithm: (algorithm: string) =>
        fetchApi('/api/v1/admin/cluster/algorithm', {
          method: 'POST',
          body: JSON.stringify({ algorithm }),
        }),
      drainWorker: (workerId: string) =>
        fetchApi(`/api/v1/admin/cluster/workers/${encodeURIComponent(workerId)}/drain`, {
          method: 'POST',
        }),
      disableWorker: (workerId: string) =>
        fetchApi(`/api/v1/admin/cluster/workers/${encodeURIComponent(workerId)}/disable`, {
          method: 'POST',
        }),
      enableWorker: (workerId: string) =>
        fetchApi(`/api/v1/admin/cluster/workers/${encodeURIComponent(workerId)}/enable`, {
          method: 'POST',
        }),
      failWorker: (workerId: string) =>
        fetchApi(`/api/v1/admin/cluster/workers/${encodeURIComponent(workerId)}/fail`, {
          method: 'POST',
        }),
      recoverWorker: (workerId: string) =>
        fetchApi(`/api/v1/admin/cluster/workers/${encodeURIComponent(workerId)}/recover`, {
          method: 'POST',
        }),
      healthCheck: (workerId: string) =>
        fetchApi(`/api/v1/admin/cluster/workers/${encodeURIComponent(workerId)}/health-check`, {
          method: 'POST',
        }),
      failoverTest: (targetWorkerId?: string) =>
        fetchApi('/api/v1/admin/cluster/failover-test', {
          method: 'POST',
          body: JSON.stringify({ targetWorkerId }),
        }),
      registerWorker: (data: { id: string; name: string; host: string; port: number; weight?: number }) =>
        fetchApi('/api/v1/admin/cluster/workers/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      simulateTraffic: (count = 30) =>
        fetchApi('/api/v1/admin/cluster/simulate-traffic', {
          method: 'POST',
          body: JSON.stringify({ count }),
        }),
    },
    rateLimit: {
      getStats: () => fetchApi('/api/v1/admin/ratelimit/stats'),
      getPolicies: () => fetchApi('/api/v1/admin/ratelimit/policies'),
      updatePolicy: (id: string, updates: any) =>
        fetchApi(`/api/v1/admin/ratelimit/policies/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }),
      getEvents: () => fetchApi('/api/v1/admin/ratelimit/events'),
      testFlood: (data?: any) =>
        fetchApi('/api/v1/admin/ratelimit/test-flood', {
          method: 'POST',
          body: JSON.stringify(data || {}),
        }),
    },
  },
};

export const uploadImage = async (
  file: File,
  _pathOrProgress?: string | ((progress: number) => void),
  onProgress?: (progress: number) => void
): Promise<string> => {
  const progressCallback = typeof _pathOrProgress === 'function' ? _pathOrProgress : onProgress;
  const folder = typeof _pathOrProgress === 'string' ? _pathOrProgress.split('/')[0] : 'general';

  if (progressCallback) progressCallback(30);

  const res = await api.storage.upload(file, folder, file.name);
  if (progressCallback) progressCallback(100);
  if (res && res.success && res.url) {
    return res.url;
  }
  throw new Error(res?.message || 'Failed to upload image to Cloudflare R2.');
};
