import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import * as supabaseLib from '../../lib/supabase';
import { api, setApiAuthToken } from '../../services/api';

const TestAuthConsumer = () => {
  const { currentUser, loading, authStatus, isAuthenticated, isAdmin } = useAuth();
  return (
    <div>
      <div data-testid="authStatus">{authStatus}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
      <div data-testid="userEmail">{currentUser?.email || 'none'}</div>
      <div data-testid="role">{currentUser?.role || 'NONE'}</div>
      <div data-testid="isAdmin">{String(isAdmin)}</div>
    </div>
  );
};

describe('AuthContext Lifecycle & Anti-Blinking Regression Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setApiAuthToken(null);
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(api.auth, 'me').mockResolvedValue({
      success: false,
      user: null,
      status: 401,
    } as any);
  });

  it('follows deterministic initialization flow: INITIALIZING -> UNAUTHENTICATED when no session exists', async () => {
    const mockUnsub = vi.fn();
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initial check or wait for deterministic initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authStatus').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('userEmail').textContent).toBe('none');
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');

    // Confirm that ghn_auth_token and ghn_current_user_cache are NOT created in localStorage
    expect(localStorage.getItem('ghn_auth_token')).toBeNull();
    expect(localStorage.getItem('ghn_current_user_cache')).toBeNull();
  });

  it('follows deterministic initialization flow: loading -> authenticated when valid session exists', async () => {
    const mockUser = {
      id: 'usr-456',
      email: 'gamer@nepal.com',
      name: 'Gamer One',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };

    const mockUnsub = vi.fn();
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });
    const mockGetSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'usr-456', email: 'gamer@nepal.com' },
        },
      },
      error: null,
    });

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    vi.spyOn(api.auth, 'me').mockResolvedValue({
      success: true,
      user: mockUser,
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authStatus').textContent).toBe('authenticated');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('userEmail').textContent).toBe('gamer@nepal.com');
  });

  it('correctly sets administrative role and isAdmin flag for STORE_OWNER without oscillation', async () => {
    const mockOwner = {
      id: 'usr-owner-1',
      email: 'owner@gamehubnepal.com',
      name: 'Binod Thalal',
      role: 'STORE_OWNER',
      status: 'ACTIVE',
    };

    const mockUnsub = vi.fn();
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });
    const mockGetSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'owner-token',
          user: { id: 'usr-owner-1', email: 'owner@gamehubnepal.com' },
        },
      },
      error: null,
    });

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    vi.spyOn(api.auth, 'me').mockResolvedValue({
      success: true,
      user: mockOwner,
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authStatus').textContent).toBe('authenticated');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('role').textContent).toBe('STORE_OWNER');
    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
  });

  it('forceRevalidateAuth re-validates session against Supabase successfully', async () => {
    const mockUser = {
      id: 'usr-999',
      email: 'pro_gamer@nepal.com',
      name: 'Pro Gamer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };

    const mockUnsub = vi.fn();
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const mockRefreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'refreshed-token',
          user: { id: 'usr-999', email: 'pro_gamer@nepal.com' },
        },
      },
      error: null,
    });

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        refreshSession: mockRefreshSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    vi.spyOn(api.auth, 'me')
      .mockResolvedValueOnce({ success: false, user: null, status: 401 } as any)
      .mockResolvedValue({
        success: true,
        user: mockUser,
      });

    let authContextRef: any = null;
    const TestConsumerWithRef = () => {
      const auth = useAuth();
      authContextRef = auth;
      return (
        <div>
          <div data-testid="authStatus">{auth.authStatus}</div>
          <div data-testid="userName">{auth.currentUser?.name || 'none'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestConsumerWithRef />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authStatus').textContent).toBe('unauthenticated');
    });

    // Run forceRevalidateAuth
    const res = await authContextRef.forceRevalidateAuth({ forceSupabaseRefresh: true });
    expect(res.success).toBe(true);
    expect(res.user?.email).toBe('pro_gamer@nepal.com');

    await waitFor(() => {
      expect(screen.getByTestId('authStatus').textContent).toBe('authenticated');
      expect(screen.getByTestId('userName').textContent).toBe('Pro Gamer');
    });
  });

  it('forceRevalidateAuth sets authRecoveryError on Supabase network failure', async () => {
    const mockUnsub = vi.fn();
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });
    const mockGetSession = vi.fn().mockRejectedValue(new Error('Network connection offline'));

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    let authContextRef: any = null;
    const TestConsumerWithRef = () => {
      const auth = useAuth();
      authContextRef = auth;
      return (
        <div>
          <div data-testid="authStatus">{auth.authStatus}</div>
          <div data-testid="error">{auth.authRecoveryError || 'none'}</div>
          <div data-testid="recoveryState">{auth.authRecoveryState}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestConsumerWithRef />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authStatus').textContent).toBe('unauthenticated');
    });

    const res = await authContextRef.forceRevalidateAuth();
    expect(res.success).toBe(false);
    expect(res.error).toBe('Network connection offline');

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Network connection offline');
      expect(screen.getByTestId('recoveryState').textContent).toBe('error');
    });

    // Test clearing error
    authContextRef.clearAuthRecoveryError();
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('none');
      expect(screen.getByTestId('recoveryState').textContent).toBe('idle');
    });
  });

  it('forceRevalidateAuth gracefully handles backend syncCustomer failure', async () => {
    const mockUser = {
      id: 'usr-fallback',
      email: 'fallback@nepal.com',
      name: 'Fallback Gamer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };

    const mockUnsub = vi.fn();
    const mockOnAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });

    // getSession needs to return a session and a user so that authUser is truthy
    const mockGetSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'usr-fallback', email: 'fallback@nepal.com' },
        },
      },
      error: null,
    });

    vi.spyOn(supabaseLib, 'getClientSupabase').mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    // Make syncCustomer throw an error
    const syncError = new Error('Sync failed randomly');
    vi.spyOn(api.auth, 'syncCustomer').mockRejectedValue(syncError);

    // Fallback me call
    vi.spyOn(api.auth, 'me').mockResolvedValue({
      success: true,
      user: mockUser,
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let authContextRef: any = null;
    const TestConsumerWithRef = () => {
      const auth = useAuth();
      authContextRef = auth;
      return (
        <div>
          <div data-testid="authStatus">{auth.authStatus}</div>
          <div data-testid="userName">{auth.currentUser?.name || 'none'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestConsumerWithRef />
      </AuthProvider>
    );

    // Initial wait for load
    await waitFor(() => {
      expect(screen.getByTestId('authStatus').textContent).toBe('authenticated');
    });

    // Run forceRevalidateAuth
    const res = await authContextRef.forceRevalidateAuth();

    // Assertions
    expect(api.auth.syncCustomer).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Backend customer sync note:', syncError);

    // It should still resolve successfully using the fallback
    expect(res.success).toBe(true);
    expect(res.user?.email).toBe('fallback@nepal.com');

    consoleSpy.mockRestore();
  });
});

describe('addToSyncQueue', () => {
  it('addToSyncQueue handles corrupted localStorage JSON safely', async () => {
    // 1. Arrange
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('ghn_sync_queue', '{ corrupted json');

    let authContextRef: any = null;
    const TestConsumerWithRef = () => {
      const auth = useAuth();
      authContextRef = auth;
      return null;
    };

    render(
      <AuthProvider>
        <TestConsumerWithRef />
      </AuthProvider>
    );

    // 2. Act
    // addToSyncQueue is exposed on authContextRef now
    if (authContextRef.addToSyncQueue) {
       authContextRef.addToSyncQueue('test-user', 'test@test.com', { test: true });
    }

    // 3. Assert
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to write to local sync queue:',
      expect.any(SyntaxError)
    );

    warnSpy.mockRestore();
  });
});
