import { describe, it, expect } from 'vitest';
import { calculateOrderSummary, getCanonicalPackagePrice } from '../../utils/orderCalculations.js';

describe('Order & Financial Business Logic Calculations', () => {
  it('calculates subtotal correctly based on unit price and quantity', () => {
    const res = calculateOrderSummary({ packagePrice: 150, quantity: 3 });
    expect(res.subtotal).toBe(450);
    expect(res.discountAmount).toBe(0);
    expect(res.finalPayable).toBe(450);
    expect(res.remainingPayable).toBe(450);
  });

  it('applies percentage coupon discounts correctly with max cap', () => {
    const res = calculateOrderSummary({
      packagePrice: 1000,
      quantity: 1,
      couponDiscount: {
        type: 'percentage',
        value: 20, // 20% of 1000 = 200
        maxDiscount: 150, // Capped at 150
      },
    });

    expect(res.subtotal).toBe(1000);
    expect(res.discountAmount).toBe(150);
    expect(res.finalPayable).toBe(850);
  });

  it('applies fixed coupon discounts without exceeding subtotal', () => {
    const res = calculateOrderSummary({
      packagePrice: 50,
      quantity: 1,
      couponDiscount: {
        type: 'fixed',
        value: 100, // Fixed 100 off a 50 subtotal
      },
    });

    expect(res.subtotal).toBe(50);
    expect(res.discountAmount).toBe(50);
    expect(res.finalPayable).toBe(0);
  });

  it('respects minimum order amount requirements for coupons', () => {
    const res = calculateOrderSummary({
      packagePrice: 100,
      quantity: 1,
      couponDiscount: {
        type: 'fixed',
        value: 20,
        minOrder: 200, // requires min 200
      },
    });

    expect(res.subtotal).toBe(100);
    expect(res.discountAmount).toBe(0);
    expect(res.finalPayable).toBe(100);
  });

  it('deducts wallet balance atomically up to final payable amount', () => {
    const res = calculateOrderSummary({
      packagePrice: 500,
      quantity: 1,
      walletBalance: 200,
      useWallet: true,
    });

    expect(res.subtotal).toBe(500);
    expect(res.finalPayable).toBe(500);
    expect(res.walletDeducted).toBe(200);
    expect(res.remainingPayable).toBe(300);
  });

  it('covers full amount when wallet balance is greater than payable', () => {
    const res = calculateOrderSummary({
      packagePrice: 300,
      quantity: 1,
      walletBalance: 1000,
      useWallet: true,
    });

    expect(res.subtotal).toBe(300);
    expect(res.finalPayable).toBe(300);
    expect(res.walletDeducted).toBe(300);
    expect(res.remainingPayable).toBe(0);
  });
});
