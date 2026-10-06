export type UserRole = 'CUSTOMER' | 'STORE_OWNER' | 'SUPER_ADMIN' | 'STORE_MANAGER' | 'SUPPORT_STAFF';
export type UserStatus = 'active' | 'suspended' | 'deleted' | 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';

export interface User {
  uid: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  username?: string;
  gamer_id?: string;
  game_uids?: Record<string, string>;
  location?: string;
  address?: string;
  district?: string;
  city?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  twoFactorEnabled?: boolean;
  two_factor_enabled?: boolean;
  notificationsEnabled?: boolean;
  security_pin?: string;
  has_pin?: boolean;
  setup_completed?: boolean;
  setup_step?: number;
  favorite_games?: string[];
  notification_preferences?: Record<string, boolean>;
  // Account Verification System
  account_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_doc_type?: string;
  verification_doc_number?: string;
  verification_submitted_at?: string;
  verification_notes?: string;
  verification_rejection_reason?: string;
  verification_verified_at?: string;
  verification_verified_by?: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  createdAt: string;
  created_at?: string;
  lastLoginAt?: string;
  last_login_at?: string;
  email_verified?: boolean;
  full_name?: string;
  ordersCount?: number;
  totalSpent?: number;
  supabase_auth_user_id?: string;
}

export interface ProductPackage {
  id: string;
  name: string;
  price: number; // In NPR (Rs.) - Selling Price / Discount Price
  originalPrice?: number; // Regular Price / Compare-At MRP (strikethrough)
  discount?: number; // Discount percentage e.g. 15 (%)
  discountPrice?: number; // Alias for selling price
  popular?: boolean;
  active?: boolean;
  amountValue?: string; // e.g. "115 Diamonds"
  amount?: string | number;
  unit?: string;
  displayOrder?: number;
  display_order?: number;
}

export interface RequiredFieldsConfig {
  idFieldLabel: string;
  idPlaceholder: string;
  idHelpText?: string;
  requiresServer: boolean;
  serverFieldLabel?: string;
  serverPlaceholder?: string;
  serverOptions?: string[];
  requiresZoneId?: boolean;
  zoneIdLabel?: string;
  zoneIdPlaceholder?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  icon_url?: string;
  image_url?: string;
  active: boolean;
  display_order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  slotNumber: number; // 1 to 10
  name: string;
  gameName: string;
  category: string;
  category_id?: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  categoryIcon?: string;
  description: string;
  image: string;
  bannerImage?: string;
  gallery?: string[];
  price: number; // Base display price in NPR
  packageName: string;
  packages: ProductPackage[];
  requiredFields: RequiredFieldsConfig;
  active: boolean;
  inStock?: boolean;
  stock?: number;
  badge?: string; // "Hot", "Best Seller", "Instant", "Sale"
  deliveryMethod?: 'instant_id' | 'voucher_code' | 'account_login' | 'whatsapp_direct';
  deliveryNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'esewa' | 'khalti' | 'wallet';

export type OrderStatus =
  | 'pending_payment'
  | 'payment_verification'
  | 'payment_verified'
  | 'processing'
  | 'delivered'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface OrderActivity {
  id: string;
  orderId: string;
  action: string;
  message: string;
  note?: string;
  adminId?: string;
  adminName?: string;
  timestamp: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  title: string;
  note?: string;
  by: 'user' | 'admin' | 'system';
}

export interface Order {
  id: string; // internal UUID / ID
  order_code?: string; // customer-facing GHN-XXXX
  orderCode?: string;
  orderId?: string;
  orderNumber?: string;
  userId: string;
  customerId?: string;
  customer_id?: string;
  userName: string;
  customerName?: string;
  userEmail: string;
  customerEmail?: string;
  userPhone?: string;
  customerPhone?: string;
  userLocation?: string;
  customerLocation?: string;
  location?: string;

  productId: string;
  productName: string;
  gameName: string;
  productImage?: string;

  packageId: string;
  packageName: string;
  quantity?: number;

  amount: number; // NPR
  unitPrice?: number;
  price?: number;
  finalAmount?: number;
  totalAmount?: number;
  total_amount?: number;
  couponDiscount?: number;
  discount?: number;
  currency?: string;

  gameUserId: string;
  playerId?: string;
  uid?: string;
  gameUid?: string;
  game_uid?: string;
  game_username?: string;
  game_user_id?: string;
  player_id?: string;
  zoneId?: string;
  gameZoneId?: string;
  server?: string;
  region?: string;
  additionalInfo?: string;
  voucherCode?: string;

  paymentMethod: PaymentMethod;
  paymentGateway?: string;
  paymentAccount?: string;
  payment?: any;

  transactionId: string;
  transferId?: string;
  paymentReference?: string;
  transactionRefId?: string;
  paymentDetails?: any;

  paymentScreenshot?: string;
  paymentProofUrl?: string;
  paymentProofR2Key?: string;
  paymentScreenshotR2Key?: string;

  // Payment Resubmission / Re-Request Workflow
  resubmittedAt?: string;
  resubmissionCount?: number;
  resubmitNote?: string;
  previousRejectionReason?: string;
  isResubmitted?: boolean;

  paymentStatus?: 'pending' | 'pending_verification' | 'verified' | 'rejected';
  orderStatus?: OrderStatus;
  deliveryStatus?: string;

  status: OrderStatus;
  adminNote?: string;
  adminNotes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  processingNote?: string;
  deliveryNote?: string;

  cancellationStatus?: 'none' | 'requested' | 'approved' | 'rejected';
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationRequestId?: string;
  adminRejectionReason?: string;

  refundStatus?: 'not_applicable' | 'refund_pending' | 'processing' | 'refunded' | 'rejected' | 'pending' | 'completed' | 'failed';
  refundAmount?: number;
  refundMethod?: string;
  refundAccountName?: string;
  refundAccountNumber?: string;
  refundDate?: string;
  refundReference?: string;
  refundProofUrl?: string;
  refundNote?: string;
  refundProcessedBy?: string;

  verifiedAt?: string;
  verifiedBy?: string;
  processingAt?: string;
  processingBy?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  completedAt?: string;
  completedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;

  activities?: OrderActivity[];
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSettings {
  esewaEnabled: boolean;
  esewaQR: string;
  esewaQr?: string;
  esewaName: string;
  esewaId: string;
  esewaNumber?: string;
  esewaInstructions: string;

  khaltiEnabled: boolean;
  khaltiQR: string;
  khaltiQr?: string;
  khaltiName: string;
  khaltiId: string;
  khaltiNumber?: string;
  khaltiInstructions: string;

  imePayEnabled?: boolean;
  imePayQR?: string;
  imePayName?: string;
  imePayId?: string;
  imePayInstructions?: string;

  bankEnabled?: boolean;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  bankQR?: string;
  bankInstructions?: string;
}

export interface SupportMessageItem {
  id: string;
  ticketId: string;
  senderType: 'CUSTOMER' | 'ADMIN' | 'SUPPORT_STAFF';
  senderId?: string;
  senderName: string;
  message: string;
  attachmentUrl?: string;
  attachmentR2Key?: string;
  isInternalNote?: boolean;
  createdAt: string;
}

export interface SupportInquiry {
  id: string;
  ticketNumber?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  subject?: string;
  category?: 'Order Issue' | 'Payment Verification' | 'Game Top-Up' | 'Account Help' | 'General Inquiry' | 'Refund Request' | 'Technical Issue' | string;
  orderId?: string;
  message: string;
  priority?: 'NORMAL' | 'URGENT' | 'HIGH';
  attachmentUrl?: string;
  status: 'pending' | 'in_review' | 'replied' | 'resolved' | 'closed';
  adminReply?: string;
  repliedAt?: string;
  repliedBy?: string;
  resolvedAt?: string;
  closedAt?: string;
  messages?: SupportMessageItem[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'order_created'
  | 'payment_verification'
  | 'payment_verified'
  | 'order_processing'
  | 'order_completed'
  | 'payment_rejected'
  | 'order_cancelled'
  | 'announcement'
  | 'system'
  | 'kyc_request'
  | 'verification';

export interface Notification {
  id: string;
  recipientUid: string;
  recipientRole?: 'user' | 'admin' | 'ADMIN' | 'CUSTOMER' | string;
  userId?: string; // Backwards compatible fallback
  customerId?: string;
  isGlobal?: boolean;
  title: string;
  message: string;
  type: NotificationType | string;
  orderId?: string;
  read: boolean;
  actionUrl?: string;
  action_url?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  description: string;
  summary?: string;
  content: string;
  image: string;
  image_url?: string;
  r2_key?: string | null;
  published: boolean;
  createdAt: string;
  updatedAt?: string;
  author?: string;
}

export interface AppSettings {
  appName: string;
  storeName?: string;
  appTagline: string;
  companyName: string;
  companyAddress: string;
  logo: string; // Icon or emoji fallback
  logoUrl?: string; // Single source of truth official logo image URL or SVG data URI
  customLogoUrl?: string;
  faviconUrl?: string; // Generated or dedicated favicon URL
  logoFileName?: string; // Uploaded file name for admin reference
  
  // Ordering Status
  orderingEnabled: boolean;
  logoDimensions?: { width: number; height: number }; // Dimensions in pixels
  logoUpdatedAt?: string; // Timestamp of latest logo upload
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  supportWhatsapp?: string;
  supportWhatsApp?: string;
  viberNumber?: string;
  esewaNumber?: string;
  khaltiNumber?: string;
  esewaQr?: string;
  khaltiQr?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceUntil?: string | null;
  maintenanceDurationMinutes?: number | null;
  announcementBanner: string;
  announcementActive: boolean;
  termsAndConditions: string;
  privacyPolicy: string;
  businessRegistrationNumber?: string;
  businessPan?: string;
  vatNumber?: string;
  complaintContact?: string;
  responsibleBusinessInfo?: string;
  r2_account_id?: string;
  r2_bucket_name?: string;
  r2_public_domain?: string;
  r2_access_key_id?: string;
  r2_secret_access_key?: string;
}

export type UserNavTab =
  | 'home'
  | 'shop'
  | 'product_detail'
  | 'reviews'
  | 'checkout'
  | 'orders'
  | 'order_detail'
  | 'news'
  | 'profile'
  | 'settings'
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'reset_password'
  | 'admin'
  | 'about'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'refund_policy'
  | 'delivery_policy'
  | 'payment_policy'
  | 'faq';

export type BannerType = 'hero' | 'offer';

export type BannerActionType =
  | 'product'
  | 'category'
  | 'shop'
  | 'offer'
  | 'news'
  | 'orders'
  | 'external'
  | 'none';

export interface Banner {
  id: string;
  type: BannerType;
  title: string;
  subtitle: string;
  badge: string;
  buttonText: string;
  actionType: BannerActionType;
  actionTarget?: string; // Product ID, Category Name, News ID, or External URL
  image: string; // Background Image
  mobileImage?: string;
  desktopImage?: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  views?: number;
  clicks?: number;
}

export type AdminTab =
  | 'overview'
  | 'ai_studio'
  | 'orders'
  | 'order_detail'
  | 'products'
  | 'product_new'
  | 'product_edit'
  | 'banners'
  | 'special_offers'
  | 'banner_new'
  | 'banner_edit'
  | 'users'
  | 'customers'
  | 'user_detail'
  | 'kyc'
  | 'payments'
  | 'reviews'
  | 'inquiries'
  | 'news'
  | 'news_new'
  | 'news_edit'
  | 'notifications'
  | 'payment_settings'
  | 'reports'
  | 'app_settings'
  | 'activity_logs'
  | 'legal'
  | 'backup_jobs'
  | 'system_events'
  | 'refunds'
  | 'refund_process'
  | 'coupons'
  | 'cancellations'
  | 'password_resets'
  | 'packages'
  | 'games'
  | 'categories'
  | 'media_vault'
  | 'maintenance'
  | 'db_inspector'
  | 'global_search'
  | 'system_health'
  | 'system_fetcher'
  | 'control_center'
  | 'infrastructure'
  | 'cache'
  | 'roles_permissions'
  | 'wallets'
  | 'security'
  | 'rate_limiting'
  | 'performance'
  | 'team_applications'
  | 'invitations';

export interface UserInvitation {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by?: string;
  invited_by_name?: string;
  invited_at: string;
  accepted_at?: string | null;
  expires_at?: string | null;
  user_id?: string | null;
  inviteLink?: string | null;
  metadata?: Record<string, any> | null;
}

export interface Wallet {
  id: string;
  walletCode?: string;
  code?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  gamerId?: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  walletCode?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'FAILED';
  paymentMethod?: string;
  reference?: string;
  description?: string;
  orderId?: string;
  adminVerified?: boolean;
  adminVerifiedBy?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  customerName: string;
  userName?: string;
  customerEmail: string;
  email?: string;
  customerPhone?: string;
  phone?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  createdAt?: string;
  expiresAt?: number;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  targetType:
    | 'product'
    | 'order'
    | 'user'
    | 'payment_settings'
    | 'app_settings'
    | 'news'
    | 'notification'
    | 'review'
    | 'auth';
  targetId?: string;
  description: string;
  createdAt: string;
}


export interface Coupon {
  id: string;
  code: string;
  name?: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  category: 'All' | 'Special Offers' | 'Payment Offers' | 'New User Offers' | string;
  isActive: boolean;
  usedCount: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  createdAt: string;
  updatedAt: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  lastSyncedAt?: string;
  // Fallbacks for API backwards compatibility
  discount_type?: string;
  discount_value?: number | string;
  is_active?: boolean;
  active?: boolean;
  usage_limit?: number;
  used_count?: number;
  min_order_amount?: number | string;
  max_discount?: number | string;
  starts_at?: string | null;
  expires_at?: string | null;
}

export interface CancellationRequest {
  id: string;
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  
  productId: string;
  productName: string;
  packageName: string;
  amount: number;

  reason: string;
  userNote?: string;
  notes?: string;

  // Refund Destination details requested by user
  refundMethod?: string; // 'eSewa' | 'Khalti' | 'Bank Transfer' | 'IME Pay' | string
  refundAccountName?: string;
  refundAccountNumber?: string;

  orderStatusBeforeRequest: OrderStatus;

  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
  rejectionReason?: string;

  refundStatus?: 'not_applicable' | 'refund_pending' | 'processing' | 'refunded' | 'rejected' | 'pending' | 'completed' | 'failed';
  refundAmount?: number;
  refundReference?: string;
  refundProofUrl?: string;
  refundDate?: string;
  refundProcessedBy?: string;
}

export interface Review {
  id: string;
  orderId?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  productId?: string;
  productName: string;
  productImage?: string;
  packageName?: string;
  rating: number;
  comment: string;
  isVerifiedBuyer?: boolean;
  status?: 'published' | 'hidden';
  userLocation?: string;
  adminReply?: string;
  adminReplyAt?: string;
  createdAt: string;
  updatedAt?: string;
}
