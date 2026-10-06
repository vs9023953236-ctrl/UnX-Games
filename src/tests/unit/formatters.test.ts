import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  formatNPR,
  formatNPRShort,
  generateOrderId,
  generateTeamApplicationId,
  normalizeOrderCode,
  formatDisplayOrderId,
  isOrderAwaitingPaymentVerification,
  formatPersonName,
  formatRoleTitle,
  formatActorName,
  formatPaymentGatewayName,
  getOrderAccountLabel,
  getOrderAccountShortLabel,
  cleanLocation,
  formatTimeAgo,
} from '../../utils/formatters';

describe('Formatters & Utility Functions', () => {

  describe('Time Ago Formatting', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-10-01T12:00:00Z'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('returns "Just now" for times less than 60 seconds ago', () => {
      expect(formatTimeAgo('2023-10-01T11:59:30Z')).toBe('Just now');
      expect(formatTimeAgo('2023-10-01T11:59:59Z')).toBe('Just now');
      expect(formatTimeAgo('2023-10-01T12:00:00Z')).toBe('Just now');
    });

    it('returns "m ago" for times less than 60 minutes ago', () => {
      expect(formatTimeAgo('2023-10-01T11:59:00Z')).toBe('1m ago');
      expect(formatTimeAgo('2023-10-01T11:30:00Z')).toBe('30m ago');
      expect(formatTimeAgo('2023-10-01T11:01:00Z')).toBe('59m ago');
    });

    it('returns "h ago" for times less than 24 hours ago', () => {
      expect(formatTimeAgo('2023-10-01T11:00:00Z')).toBe('1h ago');
      expect(formatTimeAgo('2023-10-01T00:00:00Z')).toBe('12h ago');
      expect(formatTimeAgo('2023-09-30T13:00:00Z')).toBe('23h ago');
    });

    it('returns "d ago" for times less than 30 days ago', () => {
      expect(formatTimeAgo('2023-09-30T12:00:00Z')).toBe('1d ago');
      expect(formatTimeAgo('2023-09-15T12:00:00Z')).toBe('16d ago');
      expect(formatTimeAgo('2023-09-02T12:00:00Z')).toBe('29d ago');
    });

    it('returns localized date string for times 30 or more days ago', () => {
      const dateString30Days = formatTimeAgo('2023-09-01T12:00:00Z');
      expect(dateString30Days).toBe(new Date('2023-09-01T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const dateString60Days = formatTimeAgo('2023-08-02T12:00:00Z');
      expect(dateString60Days).toBe(new Date('2023-08-02T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    });

    it('handles invalid date strings gracefully', () => {
      expect(formatTimeAgo('invalid date')).toBe('Invalid Date');
      expect(formatTimeAgo('')).toBe('Invalid Date');
    });

    it('returns "Recent" when an error is thrown', () => {
      expect(formatTimeAgo(Symbol('invalid') as any)).toBe('Recent');
    });
  });

  describe('Nepali Currency Formatting', () => {
    it('formats numbers to NPR correctly with Rs. prefix', () => {
      expect(formatNPR(0)).toBe('Rs. 0');
      expect(formatNPR(150)).toBe('Rs. 150');
      expect(formatNPR(1250)).toMatch(/^Rs\.\s*1,?250$/);
      expect(formatNPRShort(500)).toBe('Rs. 500');
    });

    it('gracefully handles null, undefined, and NaN', () => {
      expect(formatNPR(null)).toBe('Rs. 0');
      expect(formatNPR(undefined)).toBe('Rs. 0');
      expect(formatNPR(NaN)).toBe('Rs. 0');
    });
  });

  describe('Order & Team ID Generators', () => {
    it('generates canonical order IDs with UNX- or GHN- prefix', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();
      expect(id1).toMatch(/^(UNX|GHN)-[2-9A-Z]{8}$/);
      expect(id2).toMatch(/^(UNX|GHN)-[2-9A-Z]{8}$/);
      expect(id1).not.toBe(id2);
    });

    it('generates canonical team application IDs with UNX-TEAM- or GHN-TEAM- prefix', () => {
      const teamId = generateTeamApplicationId();
      expect(teamId).toMatch(/^(UNX|GHN)-TEAM-[2-9A-Z]{8}$/);
    });
  });

  describe('Order Code Normalization', () => {
    it('normalizes various user inputs to uppercase GHN- prefixed codes', () => {
      expect(normalizeOrderCode('GHN-ABCD1234')).toBe('GHN-ABCD1234');
      expect(normalizeOrderCode('ghn-abcd1234')).toBe('GHN-ABCD1234');
      expect(normalizeOrderCode('track order: GHN-12345678')).toBe('GHN-12345678');
      expect(normalizeOrderCode('order #GHN-XYZ999')).toBe('GHN-XYZ999');
      expect(normalizeOrderCode('')).toBe('');
      expect(normalizeOrderCode(null)).toBe('');
    });
  });

  describe('Display Order ID Formatter', () => {
    it('extracts and cleans display order ID from diverse object schemas', () => {
      expect(formatDisplayOrderId({ order_code: 'GHN-98765432' })).toBe('UNX-98765432');
      expect(formatDisplayOrderId({ orderCode: 'GHN-11223344' })).toBe('UNX-11223344');
      expect(formatDisplayOrderId({ orderNumber: 'GHN-55667788' })).toBe('UNX-55667788');
      expect(formatDisplayOrderId('GHN-ABCDEFGH')).toBe('UNX-ABCDEFGH');
      expect(formatDisplayOrderId(null)).toBe('');
    });
  });

  describe('Payment Verification State Checking', () => {
    it('correctly identifies orders awaiting payment verification', () => {
      expect(isOrderAwaitingPaymentVerification({
        orderStatus: 'payment_verification',
        paymentStatus: 'pending'
      })).toBe(true);

      expect(isOrderAwaitingPaymentVerification({
        orderStatus: 'pending_payment',
        paymentStatus: 'pending_verification'
      })).toBe(true);

      expect(isOrderAwaitingPaymentVerification({
        orderStatus: 'completed',
        paymentStatus: 'verified'
      })).toBe(false);

      expect(isOrderAwaitingPaymentVerification({
        orderStatus: 'cancelled',
        paymentStatus: 'failed'
      })).toBe(false);

      expect(isOrderAwaitingPaymentVerification(null)).toBe(false);
    });
  });

  describe('Name & Role Formatting', () => {
    it('formats person names cleanly', () => {
      expect(formatPersonName('binodthalal')).toBe('Binod Thalal');
      expect(formatPersonName('hii.binodthalal@gmail.com')).toBe('Binod Thalal');
      expect(formatPersonName('john_doe')).toBe('John Doe');
      expect(formatPersonName('JaneDoe')).toBe('Jane Doe');
      expect(formatPersonName('')).toBe('');
      expect(formatPersonName(null)).toBe('');
    });

    it('formats canonical role titles accurately', () => {
      expect(formatRoleTitle('STORE_OWNER')).toBe('Store Owner');
      expect(formatRoleTitle('SUPER_ADMIN')).toBe('Super Admin');
      expect(formatRoleTitle('STORE_MANAGER')).toBe('Store Manager');
      expect(formatRoleTitle('SUPPORT_STAFF')).toBe('Support Staff');
      expect(formatRoleTitle('CUSTOMER')).toBe('Customer');
      expect(formatRoleTitle('')).toBe('');
    });

    it('formats actor names with system and role awareness', () => {
      expect(formatActorName('system')).toBe('System (Automated)');
      expect(formatActorName('system (wallet)')).toBe('System (Wallet)');
      expect(formatActorName('customer')).toBe('Customer');
      expect(formatActorName('admin', 'SUPER_ADMIN')).toBe('Admin (Super Admin)');
      expect(formatActorName('Binod Thalal', 'STORE_OWNER')).toBe('Binod Thalal (Store Owner)');
    });
  });

  describe('Payment Gateway and Account Label Helpers', () => {
    it('formats payment gateway names cleanly', () => {
      expect(formatPaymentGatewayName('wallet')).toBe('Gamer Wallet');
      expect(formatPaymentGatewayName('esewa')).toBe('eSewa QR & ID');
      expect(formatPaymentGatewayName('khalti')).toBe('Khalti Wallet');
      expect(formatPaymentGatewayName(null)).toBe('Gamer Wallet');
    });

    it('determines appropriate dynamic account field labels', () => {
      expect(getOrderAccountLabel({ uid: 'test@gmail.com' })).toBe('Account Email / Delivery ID');
      expect(getOrderAccountLabel({ gameName: 'Roblox', uid: 'GamerX' })).toBe('Account Username / ID');
      expect(getOrderAccountLabel({ gameName: 'Free Fire', uid: '12345678' })).toBe('Player UID / Game ID');
      expect(getOrderAccountShortLabel({ uid: 'test@gmail.com' })).toBe('Account Email');
    });

    it('deduplicates location strings', () => {
      expect(cleanLocation('Kathmandu, Kathmandu, Nepal')).toBe('Kathmandu, Nepal');
      expect(cleanLocation(null)).toBe('Nepal');
    });
  });
});
