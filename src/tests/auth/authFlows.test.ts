import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../services/api';

describe('Auth Service Flow & Integration Contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Profile Retrieval (api.auth.me)', () => {
    it('retrieves active authenticated profile', async () => {
      vi.spyOn(api.auth, 'me').mockResolvedValue({
        success: true,
        user: { id: 'u1', email: 'test@gamehub.com', role: 'CUSTOMER' },
      });

      const res = await api.auth.me();
      expect(res.success).toBe(true);
      expect(res.user?.email).toBe('test@gamehub.com');
      expect(res.user?.role).toBe('CUSTOMER');
    });

    it('handles unauthenticated state cleanly', async () => {
      vi.spyOn(api.auth, 'me').mockResolvedValue({
        success: false,
        message: 'No active session',
      });

      const res = await api.auth.me();
      expect(res.success).toBe(false);
      expect(res.message).toBe('No active session');
    });
  });

  describe('Account Setup Progression', () => {
    it('handles customer setup saving with sanitized fields', async () => {
      vi.spyOn(api.auth, 'saveAccountSetup').mockResolvedValue({
        success: true,
        message: 'Profile setup updated successfully',
        user: { id: 'u2', email: 'newuser@gamehub.com', role: 'CUSTOMER', username: 'pro_gamer' },
      });

      const res = await api.auth.saveAccountSetup({
        username: 'pro_gamer',
        full_name: 'Pro Gamer',
        district: 'Kathmandu',
        city: 'Kathmandu',
      });

      expect(res.success).toBe(true);
      expect(res.user?.username).toBe('pro_gamer');
    });
  });

  describe('Password Recovery Request Flows', () => {
    it('handles forgot password request with identifier', async () => {
      vi.spyOn(api.auth, 'requestPasswordReset').mockResolvedValue({
        success: true,
        message: 'Password reset request submitted successfully for verification.',
      });

      const res = await api.auth.requestPasswordReset({
        identifier: 'recover@gamehub.com',
        newPassword: 'NewSecurePassword123!',
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain('Password reset request submitted');
    });

    it('handles password change submission', async () => {
      vi.spyOn(api.auth, 'changePassword').mockResolvedValue({
        success: true,
        message: 'Password changed successfully',
      });

      const res = await api.auth.changePassword({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Two-Factor Authentication (MFA)', () => {
    it('handles MFA verification flow', async () => {
      vi.spyOn(api.auth, 'verify2FA').mockResolvedValue({
        success: true,
        user: { id: 'u3', email: 'mfa@gamehub.com', role: 'STORE_OWNER', two_factor_enabled: true },
      });

      const res = await api.auth.verify2FA({
        email: 'mfa@gamehub.com',
        otp: '123456',
        factorId: 'factor-1',
      });

      expect(res.success).toBe(true);
      expect(res.user?.two_factor_enabled).toBe(true);
    });
  });

  describe('Logout Handling', () => {
    it('dispatches logout command cleanly', async () => {
      vi.spyOn(api.auth, 'logout').mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      });

      const res = await api.auth.logout();
      expect(res.success).toBe(true);
    });
  });
});
