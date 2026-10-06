import { describe, it, expect } from 'vitest';
import {
  getRoleLevel,
  hasPermission,
  isStoreOwnerAccount,
  ROLE_PERMISSIONS,
  sanitizeUser,
} from '../../../server/auth';

describe('RBAC & Role Permission Enforcement', () => {
  describe('Role Hierarchy Levels', () => {
    it('enforces strict role hierarchy order: STORE_OWNER (4) > SUPER_ADMIN (3) > STORE_MANAGER (2) > SUPPORT_STAFF (1) > CUSTOMER (0)', () => {
      expect(getRoleLevel('STORE_OWNER')).toBe(4);
      expect(getRoleLevel('OWNER')).toBe(4);
      expect(getRoleLevel('SUPER_ADMIN')).toBe(3);
      expect(getRoleLevel('STORE_MANAGER')).toBe(2);
      expect(getRoleLevel('ADMIN')).toBe(2);
      expect(getRoleLevel('SUPPORT_STAFF')).toBe(1);
      expect(getRoleLevel('STAFF')).toBe(1);
      expect(getRoleLevel('CUSTOMER')).toBe(0);
      expect(getRoleLevel('USER')).toBe(0);
      expect(getRoleLevel(undefined)).toBe(0);
    });
  });

  describe('Store Owner Account Protection', () => {
    it('identifies STORE_OWNER role as protected', () => {
      expect(isStoreOwnerAccount({ role: 'STORE_OWNER' })).toBe(true);
      expect(isStoreOwnerAccount({ role: 'SUPER_ADMIN' })).toBe(false);
      expect(isStoreOwnerAccount({ role: 'CUSTOMER' })).toBe(false);
      expect(isStoreOwnerAccount(null)).toBe(false);
    });
  });

  describe('Permission Verification (hasPermission)', () => {
    it('grants STORE_OWNER full unrestricted permission across all operations', () => {
      expect(hasPermission('STORE_OWNER', 'any.arbitrary.permission')).toBe(true);
      expect(hasPermission('STORE_OWNER', 'orders.process')).toBe(true);
      expect(hasPermission('STORE_OWNER', 'users.delete')).toBe(true);
    });

    it('grants SUPER_ADMIN privileged administrative permissions but respects defined set', () => {
      expect(hasPermission('SUPER_ADMIN', 'orders.process')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'customers.manage')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'payments.verify')).toBe(true);
    });

    it('restricts STORE_MANAGER from dangerous administration such as users.delete', () => {
      expect(hasPermission('STORE_MANAGER', 'orders.process')).toBe(true);
      expect(hasPermission('STORE_MANAGER', 'products.create')).toBe(true);
      expect(hasPermission('STORE_MANAGER', 'users.delete')).toBe(false);
    });

    it('restricts SUPPORT_STAFF to read/support actions only', () => {
      expect(hasPermission('SUPPORT_STAFF', 'support.reply')).toBe(true);
      expect(hasPermission('SUPPORT_STAFF', 'orders.view')).toBe(true);
      expect(hasPermission('SUPPORT_STAFF', 'products.create')).toBe(false);
      expect(hasPermission('SUPPORT_STAFF', 'payments.verify')).toBe(false);
      expect(hasPermission('SUPPORT_STAFF', 'users.delete')).toBe(false);
    });

    it('grants CUSTOMER zero administrative permissions', () => {
      expect(hasPermission('CUSTOMER', 'orders.view')).toBe(false);
      expect(hasPermission('CUSTOMER', 'dashboard.view')).toBe(false);
      expect(hasPermission('CUSTOMER', 'support.reply')).toBe(false);
    });

    it('respects custom permission overrides if provided', () => {
      expect(hasPermission('SUPPORT_STAFF', 'orders.process', { 'orders.process': true })).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'orders.process', { 'orders.process': false })).toBe(false);
    });
  });

  describe('User Sanitization (Security)', () => {
    it('strips all sensitive credentials from user objects before serialization', () => {
      const rawUser = {
        id: 'user-123',
        email: 'gamer@example.com',
        full_name: 'Gamer One',
        password_hash: '$2b$10$supersecretpasswordhash',
        password: 'plain_password',
        security_pin: '$2b$10$pinhash',
        totp_secret: 'MFASECRET123',
        backup_codes: ['code1', 'code2'],
        role: 'CUSTOMER',
        status: 'ACTIVE',
      };

      const sanitized = sanitizeUser(rawUser);
      expect(sanitized).toBeDefined();
      expect(sanitized.id).toBe('user-123');
      expect(sanitized.email).toBe('gamer@example.com');
      expect(sanitized.has_security_pin).toBe(true);
      expect(sanitized.has_pin).toBe(true);

      // Sensitive fields MUST be completely stripped
      expect(sanitized.password_hash).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.security_pin).toBeUndefined();
      expect(sanitized.totp_secret).toBeUndefined();
      expect(sanitized.backup_codes).toBeUndefined();
    });
  });
});
