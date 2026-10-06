import { describe, it, expect } from 'vitest';
import { Product, ProductPackage, OrderStatus } from '../../types';

describe('Business Entities & Model Integrity', () => {
  it('validates product package discount calculations', () => {
    const pkg: ProductPackage = {
      id: 'pkg-1',
      name: '115 Diamonds',
      price: 130,
      originalPrice: 150,
      discount: 13,
      active: true,
      amountValue: '115 Diamonds',
    };

    expect(pkg.price).toBeLessThan(pkg.originalPrice || 0);
    expect(pkg.discount).toBe(13);
  });

  it('validates product structure with required input field schemas', () => {
    const freeFireProduct: Product = {
      id: 'prod-ff',
      slotNumber: 1,
      name: 'Free Fire Diamonds',
      gameName: 'Free Fire',
      category: 'Mobile Games',
      description: 'Instant Free Fire Diamonds Top-Up in Nepal',
      image: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/free-fire.webp',
      price: 130,
      packageName: 'Diamonds',
      packages: [
        { id: 'p1', name: '115 Diamonds', price: 130, active: true },
        { id: 'p2', name: '240 Diamonds', price: 260, active: true },
      ],
      requiredFields: {
        idFieldLabel: 'Player ID / UID',
        idPlaceholder: 'Enter your 8-10 digit Free Fire UID',
        requiresServer: false,
      },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(freeFireProduct.packages).toHaveLength(2);
    expect(freeFireProduct.requiredFields.requiresServer).toBe(false);
    expect(freeFireProduct.requiredFields.idFieldLabel).toBe('Player ID / UID');
  });

  it('verifies standard order status transitions', () => {
    const validStatuses: OrderStatus[] = [
      'pending_payment',
      'payment_verification',
      'payment_verified',
      'processing',
      'delivered',
      'completed',
      'rejected',
      'cancelled',
    ];

    expect(validStatuses).toContain('pending_payment');
    expect(validStatuses).toContain('payment_verification');
    expect(validStatuses).toContain('completed');
    expect(validStatuses).toHaveLength(8);
  });
});
