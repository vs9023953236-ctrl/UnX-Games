const KNOWN_PROMO_CODES = [
  'FREEFIRE',
  'NEPALVIP',
  'FESTIVE20',
  'GHN5',
  'GHN10',
  'GHN15',
  'WELCOME5',
  'WELCOME10',
  'TOPUP10',
  'LAUNCH15',
  'WELCOME50',
  'PUBGUC',
  'MLBB50',
  'ROBUX10',
];

const EXCLUDED_PROMO_WORDS = new Set([
  'CODE',
  'CODES',
  'BENEFITS',
  'THIS',
  'USING',
  'WITH',
  'FOR',
  'OUR',
  'THE',
  'YOUR',
  'MORE',
  'SHOP',
  'JUST',
  'CHECK',
  'FREE',
  'FIRE',
  'GAMES',
  'GAME',
  'STORE',
  'NEPAL',
  'TEAM',
  'CLICK',
  'HERE',
  'READ',
  'FULL',
  'STORY',
  'DEALS',
  'PROMOS',
  'UPDATES',
  'SUPPORT',
  'USER',
  'ADMIN',
  'ORDER',
  'ORDERS',
  'DURING',
  'DISCOUNT',
  'DISCOUNTS',
  'COUPON',
  'COUPONS',
  'VOUCHER',
  'VOUCHERS',
  'SPECIAL',
  'REWARDS',
  'HIGHLIGHTS',
  'OFFERS',
  'OPTIONS',
  'DETAILS',
  'INSTANT',
  'SAVE',
  'SAVINGS',
  'ENTER',
  'APPLY',
  'CHECKOUT',
  'PAYMENT',
  'PROMO',
  'MEMBER',
  'MEMBERS',
  'LOYALTY',
  'PERKS',
  'WEEKEND',
  'FLASH',
  'WEEKLY',
  'MONTHLY',
  'NEW',
  'NOW',
  'EXCLUSIVE',
  'VERIFIED',
  'SERVICE',
]);

/**
 * Safely extracts a working promo code from any text content or article body.
 */
export function extractPromoCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const upperText = text.toUpperCase();

  // 1. Check if any known active promo code is present in text
  for (const knownCode of KNOWN_PROMO_CODES) {
    if (upperText.includes(knownCode)) {
      return knownCode;
    }
  }

  // 2. Search for regex patterns following compound or single keywords
  const regex = /(?:voucher\s+code|promo\s+code|coupon\s+code|code|promo|coupon|voucher|use)[:\s]+([A-Z0-9_-]{4,15})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const candidate = match[1].toUpperCase();
    if (!EXCLUDED_PROMO_WORDS.has(candidate) && !/^\d+$/.test(candidate)) {
      return candidate;
    }
  }

  // 3. Fallback: Standalone uppercase token of length 4 to 12 if preceded by "code" or "coupon"
  const standaloneRegex = /\b(?:code|coupon|promo|voucher)\b[\s:]*([A-Z0-9]{4,12})\b/i;
  const standaloneMatch = text.match(standaloneRegex);
  if (standaloneMatch) {
    const candidate = standaloneMatch[1].toUpperCase();
    if (!EXCLUDED_PROMO_WORDS.has(candidate) && !/^\d+$/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}
