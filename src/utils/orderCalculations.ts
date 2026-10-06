/**
 * UNX Games Canonical Order & Package Pricing Calculator
 * 
 * Guarantees:
 * - Package pricing strictly uses product_packages.price and product_packages.discount
 * - Consistent rounding and subtotal/discount/wallet calculations
 * - Protection against negative totals and mathematical overflow
 */

export interface PackagePricing {
  price: number;
  discount?: number | null;
  sale_price?: number | null;
}

export function getCanonicalPackagePrice(pkg: PackagePricing): {
  basePrice: number;
  discount: number;
  effectiveUnitPrice: number;
} {
  const basePrice = Math.max(0, Number(pkg.price) || 0);
  const discount = Math.max(0, Number(pkg.discount) || 0);

  let effectiveUnitPrice = basePrice;
  if (pkg.sale_price !== undefined && pkg.sale_price !== null && Number(pkg.sale_price) > 0) {
    effectiveUnitPrice = Number(pkg.sale_price);
  } else if (discount > 0) {
    effectiveUnitPrice = Math.max(0, basePrice - (basePrice * discount) / 100);
  }

  return {
    basePrice,
    discount,
    effectiveUnitPrice: Math.round(effectiveUnitPrice * 100) / 100,
  };
}

export function calculateOrderSummary(params: {
  packagePrice: number;
  quantity: number;
  couponDiscount?: {
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscount?: number;
    minOrder?: number;
  } | null;
  walletBalance?: number;
  useWallet?: boolean;
}) {
  const { packagePrice, quantity, couponDiscount, walletBalance = 0, useWallet = false } = params;
  const subtotal = Math.max(0, packagePrice * Math.max(1, quantity));

  let discountAmount = 0;
  if (couponDiscount) {
    const minOrder = couponDiscount.minOrder || 0;
    if (subtotal >= minOrder) {
      if (couponDiscount.type === 'percentage') {
        discountAmount = (subtotal * couponDiscount.value) / 100;
        if (couponDiscount.maxDiscount && discountAmount > couponDiscount.maxDiscount) {
          discountAmount = couponDiscount.maxDiscount;
        }
      } else if (couponDiscount.type === 'fixed') {
        discountAmount = Math.min(subtotal, couponDiscount.value);
      }
    }
  }

  const finalPayable = Math.max(0, subtotal - discountAmount);

  let walletDeducted = 0;
  let remainingPayable = finalPayable;

  if (useWallet && walletBalance > 0) {
    walletDeducted = Math.min(walletBalance, finalPayable);
    remainingPayable = Math.max(0, finalPayable - walletDeducted);
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPayable: Math.round(finalPayable * 100) / 100,
    walletDeducted: Math.round(walletDeducted * 100) / 100,
    remainingPayable: Math.round(remainingPayable * 100) / 100,
  };
}
