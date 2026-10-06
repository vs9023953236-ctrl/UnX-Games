// Central Rate Limit Configuration for Unx Games
export interface RateLimitRule {
  limit: number;
  windowMs: number;
  actionName: string;
}

export const RATE_LIMIT_CONFIG = {
  // --- Supabase Canonical Auth Dashboard Settings ---
  // 1. Email sending rate limit: 30 emails / hour from project
  SUPABASE_EMAIL_LIMIT_1H: { limit: 30, windowMs: 60 * 60 * 1000, actionName: 'supabase-email-1h' },
  // 2. SMS sending rate limit: 30 SMS / hour from project
  SUPABASE_SMS_LIMIT_1H: { limit: 30, windowMs: 60 * 60 * 1000, actionName: 'supabase-sms-1h' },
  // 3. Token refreshes: 150 requests / 5 minutes per IP (1800/h)
  SUPABASE_TOKEN_REFRESH_IP_5M: { limit: 150, windowMs: 5 * 60 * 1000, actionName: 'supabase-token-refresh-5m' },
  // 4. Token verifications: 30 requests / 5 minutes per IP
  SUPABASE_TOKEN_VERIFY_IP_5M: { limit: 30, windowMs: 5 * 60 * 1000, actionName: 'supabase-token-verify-5m' },
  // 5. Sign-ups and sign-ins: 30 requests / 5 minutes per IP (360/h)
  SUPABASE_SIGNUP_SIGNIN_IP_5M: { limit: 30, windowMs: 5 * 60 * 1000, actionName: 'supabase-signup-signin-5m' },
  // 6. Anonymous users: 30 requests / hour per IP
  SUPABASE_ANON_USERS_IP_1H: { limit: 30, windowMs: 60 * 60 * 1000, actionName: 'supabase-anon-users-1h' },
  // 7. Web3 sign-ups and sign-ins: 30 requests / 5 minutes per IP
  SUPABASE_WEB3_AUTH_IP_5M: { limit: 30, windowMs: 5 * 60 * 1000, actionName: 'supabase-web3-auth-5m' },

  // --- Granular Application Rate Limits & Anti-Abuse ---
  // Authentication - Login (Synced with Supabase 30 req / 5m per IP)
  LOGIN_IP: { limit: 30, windowMs: 5 * 60 * 1000, actionName: 'login-ip' },
  LOGIN_ACCOUNT: { limit: 5, windowMs: 15 * 60 * 1000, actionName: 'login-account' }, // 5 failed attempts / 15m / email

  // Authentication - Signup (Synced with Supabase 30 req / 5m per IP)
  SIGNUP_IP: { limit: 30, windowMs: 5 * 60 * 1000, actionName: 'signup-ip' },

  // OTP Send Limits
  OTP_RESEND_COOLDOWN: { limit: 1, windowMs: 60 * 1000, actionName: 'otp-resend-cooldown' }, // 1 request / 60s cooldown per email
  OTP_SEND_EMAIL_10M: { limit: 3, windowMs: 10 * 60 * 1000, actionName: 'otp-send-email-10m' }, // 3 req / 10m / email
  OTP_SEND_EMAIL_1H: { limit: 5, windowMs: 60 * 60 * 1000, actionName: 'otp-send-email-1h' }, // 5 req / 1h / email
  OTP_SEND_IP_1H: { limit: 20, windowMs: 60 * 60 * 1000, actionName: 'otp-send-ip-1h' }, // 20 req / 1h / IP (within 30/h Supabase project limit)

  // OTP Verify Limits (Synced with Supabase 30 req / 5m per IP)
  OTP_VERIFY_EMAIL_10M: { limit: 5, windowMs: 10 * 60 * 1000, actionName: 'otp-verify-email-10m' }, // 5 attempts / 10m / email
  OTP_VERIFY_IP_1H: { limit: 30, windowMs: 5 * 60 * 1000, actionName: 'otp-verify-ip-5m' }, // 30 attempts / 5m / IP

  // Password Reset Limits
  PASSWORD_RESET_EMAIL: { limit: 5, windowMs: 60 * 60 * 1000, actionName: 'password-reset-email' }, // 5 req / 1h / email
  PASSWORD_RESET_IP: { limit: 20, windowMs: 60 * 60 * 1000, actionName: 'password-reset-ip' }, // 20 req / 1h / IP

  // Token Refreshes (Synced with Supabase 150 req / 5m per IP)
  TOKEN_REFRESH_IP_5M: { limit: 150, windowMs: 5 * 60 * 1000, actionName: 'token-refresh-ip-5m' },

  // Support / Inquiries
  CONTACT_SUPPORT: { limit: 10, windowMs: 60 * 60 * 1000, actionName: 'contact-support' }, // 10 req / 1h / user or IP

  // Search
  SEARCH: { limit: 60, windowMs: 60 * 1000, actionName: 'search' }, // 60 req / 1m / IP or user

  // Product Data
  PRODUCT_DATA: { limit: 120, windowMs: 60 * 1000, actionName: 'product-data' }, // 120 req / 1m / IP or user

  // Orders
  ORDERS: { limit: 30, windowMs: 60 * 1000, actionName: 'orders' }, // 30 req / 1m / auth user

  // Coupons
  COUPON_VALIDATION: { limit: 20, windowMs: 60 * 1000, actionName: 'coupon-validation' }, // 20 req / 1m / auth user

  // Wallet / Payment
  WALLET_PAYMENT: { limit: 10, windowMs: 60 * 1000, actionName: 'wallet-payment' }, // 10 req / 1m / auth user

  // Admin APIs
  ADMIN_API: { limit: 30, windowMs: 60 * 1000, actionName: 'admin-api' }, // 30 req / 1m / auth user

  // Default API catch-all
  DEFAULT_PUBLIC: { limit: 60, windowMs: 60 * 1000, actionName: 'default-public' }, // 60 req / 1m / IP or user
} as const;
