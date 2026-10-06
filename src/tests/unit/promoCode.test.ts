import { describe, it, expect } from 'vitest';
import { extractPromoCode } from '../../utils/promoCode';

describe('Promo Code Extraction Utility', () => {
  it('extracts known active promo codes accurately', () => {
    expect(extractPromoCode('Get discount using FREEFIRE today!')).toBe('FREEFIRE');
    expect(extractPromoCode('Special offer with code NEPALVIP')).toBe('NEPALVIP');
    expect(extractPromoCode('Welcome bonus code: FESTIVE20')).toBe('FESTIVE20');
    expect(extractPromoCode('Apply GHN10 on checkout')).toBe('GHN10');
  });

  it('extracts dynamically specified promo codes after keywords', () => {
    expect(extractPromoCode('Use promo: WINTER2025 at checkout')).toBe('WINTER2025');
    expect(extractPromoCode('Enter coupon: SAVE50 now')).toBe('SAVE50');
    expect(extractPromoCode('Voucher code: TOPUP25')).toBe('TOPUP25');
  });

  it('excludes non-promo common dictionary words', () => {
    expect(extractPromoCode('Click here to read full story about games')).toBeNull();
    expect(extractPromoCode('Check our discount store for more deals')).toBeNull();
  });

  it('handles null, undefined, and empty string safely', () => {
    expect(extractPromoCode(null)).toBeNull();
    expect(extractPromoCode(undefined)).toBeNull();
    expect(extractPromoCode('')).toBeNull();
  });
});
