import { pgTable, serial, text, varchar, timestamp, boolean, integer, numeric, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. CUSTOMERS
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  supabase_user_id: uuid('supabase_user_id'),
  supabase_auth_user_id: varchar('supabase_auth_user_id', { length: 255 }).unique(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
    security_pin: varchar('security_pin', { length: 255 }),
  uid: varchar('uid', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  mobile: varchar('mobile', { length: 50 }),
  username: varchar('username', { length: 255 }).unique(),
  gamer_id: varchar('gamer_id', { length: 255 }),
  game_uids: jsonb('game_uids'),
  avatar_url: text('avatar_url'),
  email_verified: boolean('email_verified').default(false),
  mobile_verified: boolean('mobile_verified').default(false),
  is_verified: boolean('is_verified').default(false),
  role: varchar('role', { length: 50 }).default('CUSTOMER'),
  status: varchar('status', { length: 50 }).default('ACTIVE'),
  setup_completed: boolean('setup_completed').default(false),
  setup_step: integer('setup_step').default(1),
  favorite_games: jsonb('favorite_games'),
  notification_preferences: jsonb('notification_preferences'),
  location: varchar('location', { length: 255 }),
  address: text('address'),
  district: varchar('district', { length: 100 }),
  city: varchar('city', { length: 100 }),
  two_factor_enabled: boolean('two_factor_enabled').default(false),
  // Account Verification System
  account_verified: boolean('account_verified').default(false),
  verification_status: varchar('verification_status', { length: 50 }).default('unverified'),
  verification_doc_type: varchar('verification_doc_type', { length: 100 }),
  verification_doc_number: varchar('verification_doc_number', { length: 255 }),
  verification_submitted_at: timestamp('verification_submitted_at'),
  verification_notes: text('verification_notes'),
  verified_at: timestamp('verified_at'),
  verified_by: varchar('verified_by', { length: 255 }),
  rejection_reason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  last_login_at: timestamp('last_login_at'),
});

export const users = customers;

// 1.1 USER INVITATIONS
export const user_invitations = pgTable('user_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  full_name: varchar('full_name', { length: 255 }),
  role: varchar('role', { length: 50 }).default('CUSTOMER'),
  invited_by: varchar('invited_by', { length: 255 }),
  invited_by_name: varchar('invited_by_name', { length: 255 }),
  status: varchar('status', { length: 50 }).default('pending'), // 'pending' | 'accepted' | 'expired' | 'cancelled'
  user_id: varchar('user_id', { length: 255 }),
  invited_at: timestamp('invited_at').defaultNow(),
  accepted_at: timestamp('accepted_at'),
  expires_at: timestamp('expires_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. CATEGORIES
export const categories = pgTable('categories', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  description: text('description'),
  icon_url: text('icon_url'),
  image_url: text('image_url'),
  active: boolean('active').default(true),
  display_order: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. GAMES
export const games = pgTable('games', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  description: text('description'),
  short_description: text('short_description'),
  category_id: varchar('category_id', { length: 255 }).references(() => categories.id),
  image_url: text('image_url'),
  banner_url: text('banner_url'),
  r2_key: text('r2_key'),
  platform: varchar('platform', { length: 100 }),
  region: varchar('region', { length: 100 }),
  required_fields: jsonb('required_fields'),
  active: boolean('active').default(true),
  featured: boolean('featured').default(false),
  display_order: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. PRODUCTS
export const products = pgTable('products', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  description: text('description'),
  short_description: text('short_description'),
  category_id: varchar('category_id', { length: 255 }).references(() => categories.id),
  game_id: varchar('game_id', { length: 255 }).references(() => games.id),
  image_url: text('image_url'),
  banner_url: text('banner_url'),
  r2_key: text('r2_key'),
  currency: varchar('currency', { length: 10 }).default('NPR'),
  region: varchar('region', { length: 100 }),
  delivery_type: varchar('delivery_type', { length: 50 }),
  required_fields: jsonb('required_fields'),
  featured: boolean('featured').default(false),
  popular: boolean('popular').default(false),
  best_value: boolean('best_value').default(false),
  active: boolean('active').default(true),
  in_stock: boolean('in_stock').default(true),
  stock: integer('stock').default(99),
  archived: boolean('archived').default(false),
  display_order: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. PRODUCT PACKAGES
export const product_packages = pgTable('product_packages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  product_id: varchar('product_id', { length: 255 }).references(() => products.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  amount: numeric('amount').notNull(),
  unit: varchar('unit', { length: 50 }),
  price: numeric('price').notNull(),
  compare_at_price: numeric('compare_at_price'),
  discount: numeric('discount'),
  badge: varchar('badge', { length: 100 }),
  active: boolean('active').default(true),
  display_order: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. ORDERS
export const orders = pgTable('orders', {
  admin_notes: text('admin_notes'),
  id: varchar('id', { length: 255 }).primaryKey(),
  order_code: varchar('order_code', { length: 50 }).unique(),
  order_number: varchar('order_number', { length: 255 }).notNull().unique(),
  customer_id: uuid('customer_id').references(() => customers.id).notNull(),
  product_id: varchar('product_id', { length: 255 }).references(() => products.id),
  package_id: varchar('package_id', { length: 255 }).references(() => product_packages.id),
  game_id: varchar('game_id', { length: 255 }).references(() => games.id),
  customer_name_snapshot: varchar('customer_name_snapshot', { length: 255 }),
  customer_email_snapshot: varchar('customer_email_snapshot', { length: 255 }),
  customer_mobile_snapshot: varchar('customer_mobile_snapshot', { length: 50 }),
  game_server: varchar('game_server', { length: 255 }),
  game_username: varchar('game_username', { length: 255 }),
  region: varchar('region', { length: 100 }),
  quantity: integer('quantity').default(1),
  unit_price: numeric('unit_price'),
  discount: numeric('discount').default('0'),
  coupon_id: varchar('coupon_id', { length: 255 }),
  coupon_code_snapshot: varchar('coupon_code_snapshot', { length: 255 }),
  coupon_discount: numeric('coupon_discount').default('0'),
  total_amount: numeric('total_amount').notNull(),
  currency: varchar('currency', { length: 10 }).default('NPR'),
  payment_id: varchar('payment_id', { length: 255 }),
  payment_status: varchar('payment_status', { length: 50 }).default('pending_verification'),
  order_status: varchar('order_status', { length: 50 }).default('pending_payment'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. ORDER STATUS HISTORY
export const order_status_history = pgTable('order_status_history', {
  id: varchar('id', { length: 255 }).primaryKey(),
  order_id: varchar('order_id', { length: 255 }).notNull(),
  old_status: varchar('old_status', { length: 50 }),
  new_status: varchar('new_status', { length: 50 }),
  changed_by: varchar('changed_by', { length: 255 }),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. PAYMENTS
export const payments = pgTable('payments', {
  gateway_response: jsonb('gateway_response'),
  status: varchar('status', { length: 50 }),
  reference_code: varchar('reference_code', { length: 255 }),
  id: varchar('id', { length: 255 }).primaryKey(),
  order_id: varchar('order_id', { length: 255 }).references(() => orders.id).notNull(),
  customer_id: uuid('customer_id').references(() => customers.id),
  method: varchar('method', { length: 50 }),
  amount: numeric('amount').notNull(),
  currency: varchar('currency', { length: 10 }).default('NPR'),
  transaction_id: varchar('transaction_id', { length: 255 }),
  payment_status: varchar('payment_status', { length: 50 }).default('pending'),
  proof_url: text('proof_url'),
  proof_r2_key: text('proof_r2_key'),
  customer_note: text('customer_note'),
  submitted_at: timestamp('submitted_at').defaultNow(),
  verified_at: timestamp('verified_at'),
  verified_by: varchar('verified_by', { length: 255 }),
  rejected_at: timestamp('rejected_at'),
  rejected_by: varchar('rejected_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. PAYMENT SETTINGS
export const payment_settings = pgTable('payment_settings', {
  qr_enabled: boolean('qr_enabled').default(false),
  esewa_name: varchar('esewa_name', { length: 255 }),
  khalti_name: varchar('khalti_name', { length: 255 }),
  imepay_name: varchar('imepay_name', { length: 255 }),
  esewa_id: varchar('esewa_id', { length: 255 }),
  khalti_id: varchar('khalti_id', { length: 255 }),
  imepay_id: varchar('imepay_id', { length: 255 }),
  bank_account_name: varchar('bank_account_name', { length: 255 }),
  bank_account_number: varchar('bank_account_number', { length: 255 }),
  bank_name: varchar('bank_name', { length: 255 }),
  esewa_enabled: boolean('esewa_enabled').default(true),
  esewa_qr: text('esewa_qr'),
  khalti_enabled: boolean('khalti_enabled').default(true),
  khalti_qr: text('khalti_qr'),
  imepay_enabled: boolean('imepay_enabled').default(true),
  bank_enabled: boolean('bank_enabled').default(true),
  id: varchar('id', { length: 50 }).primaryKey(),
  method: varchar('method', { length: 50 }),
  enabled: boolean('enabled').default(true),
  display_name: varchar('display_name', { length: 255 }),
  account_name: varchar('account_name', { length: 255 }),
  account_number: varchar('account_number', { length: 255 }),
  merchant_id: varchar('merchant_id', { length: 255 }),
  instructions: text('instructions'),
  qr_image_url: text('qr_image_url'),
  qr_r2_key: text('qr_r2_key'),
  display_order: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 13. BANNERS
export const banners = pgTable('banners', {
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 255 }),
  subtitle: text('subtitle'),
  badge: varchar('badge', { length: 255 }),
  button_text: varchar('button_text', { length: 255 }),
  type: varchar('type', { length: 50 }).default('hero'),
  action_type: varchar('action_type', { length: 50 }),
  action_target: varchar('action_target', { length: 255 }),
  image_url: text('image_url').notNull(),
  mobile_image_url: text('mobile_image_url'),
  link_type: varchar('link_type', { length: 50 }),
  link_value: text('link_value'),
  link_url: text('link_url'),
  r2_key: text('r2_key'),
  active: boolean('active').default(true),
  sort_order: integer('sort_order').default(0),
  display_order: integer('display_order').default(0),
  views: integer('views').default(0),
  clicks: integer('clicks').default(0),
  start_at: timestamp('start_at'),
  end_at: timestamp('end_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 14. OFFERS
export const offers = pgTable('offers', {
  target_product_id: varchar('target_product_id', { length: 255 }),
  button_text: varchar('button_text', { length: 255 }),
  badge: varchar('badge', { length: 255 }),
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  image_url: text('image_url'),
  r2_key: text('r2_key'),
  product_id: varchar('product_id', { length: 255 }).references(() => products.id),
  discount: numeric('discount'),
  active: boolean('active').default(true),
  start_at: timestamp('start_at'),
  end_at: timestamp('end_at'),
  display_order: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 15. NEWS
export const news = pgTable('news', {
  active: boolean('active').default(true),
  tag: varchar('tag', { length: 255 }),
  category: varchar('category', { length: 255 }).default('all-updates'),
  author: varchar('author', { length: 255 }),
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  summary: text('summary'),
  content: text('content'),
  image_url: text('image_url'),
  r2_key: text('r2_key'),
  author_id: varchar('author_id', { length: 255 }),
  published: boolean('published').default(false),
  published_at: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 16. NOTIFICATIONS
export const notifications = pgTable('notifications', {
  recipient_uid: varchar('recipient_uid', { length: 255 }).default(''),
  order_id: varchar('order_id', { length: 255 }),
  recipient_role: varchar('recipient_role', { length: 50 }),
  id: varchar('id', { length: 255 }).primaryKey(),
  customer_id: varchar('customer_id', { length: 255 }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  is_global: boolean('is_global').default(false),
  type: varchar('type', { length: 50 }),
  read: boolean('read').default(false),
  action_url: varchar('action_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. SETTINGS
export const settings = pgTable('settings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value'),
  is_global: boolean('is_global').default(false),
  type: varchar('type', { length: 50 }),
  updatedAt: timestamp('updated_at').defaultNow(),
  updated_by: varchar('updated_by', { length: 255 }),
});

// 20. AUDIT LOGS
export const audit_logs = pgTable('audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  actor_id: varchar('actor_id', { length: 255 }),
  actor_role: varchar('actor_role', { length: 50 }),
  action: varchar('action', { length: 255 }).notNull(),
  entity_type: varchar('entity_type', { length: 100 }),
  entity_id: varchar('entity_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});




export const activity_logs = pgTable('activity_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  action: varchar('action', { length: 255 }).notNull(),
  description: text('description'),
  target_id: varchar('target_id', { length: 255 }),
  target_type: varchar('target_type', { length: 100 }),
  admin_id: varchar('admin_id', { length: 255 }),
  admin_name: varchar('admin_name', { length: 255 }),
  admin_email: varchar('admin_email', { length: 255 }),
  created_by: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: varchar('id', { length: 255 }).primaryKey(),
  order_id: varchar('order_id', { length: 255 }),
  user_id: varchar('user_id', { length: 255 }),
  user_name: varchar('user_name', { length: 255 }),
  user_photo: text('user_photo'),
  product_id: varchar('product_id', { length: 255 }),
  product_name: varchar('product_name', { length: 255 }),
  product_image: text('product_image'),
  package_name: varchar('package_name', { length: 255 }),
  rating: integer('rating').notNull().default(5),
  comment: text('comment'),
  is_verified_buyer: boolean('is_verified_buyer').default(true),
  status: varchar('status', { length: 50 }).default('published'),
  user_location: varchar('user_location', { length: 255 }),
  admin_reply: text('admin_reply'),
  admin_reply_at: timestamp('admin_reply_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const coupons = pgTable('coupons', {
  id: varchar('id', { length: 255 }).primaryKey(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  discount_type: varchar('discount_type', { length: 50 }).default('PERCENTAGE'),
  discount_value: numeric('discount_value').default('10'),
  discount_percentage: numeric('discount_percentage'),
  category: varchar('category', { length: 100 }).default('All'),
  minimum_order_amount: numeric('minimum_order_amount').default('0'),
  maximum_discount_amount: numeric('maximum_discount_amount').default('0'),
  min_order_amount: numeric('min_order_amount').default('0'),
  max_discount: numeric('max_discount').default('0'),
  usage_limit: integer('usage_limit').default(1000),
  usage_per_customer: integer('usage_per_customer').default(1),
  used_count: integer('used_count').default(0),
  starts_at: timestamp('starts_at'),
  expires_at: timestamp('expires_at'),
  active: boolean('active').default(true),
  is_active: boolean('is_active').default(true),
  applicable_product_id: varchar('applicable_product_id', { length: 255 }),
  applicable_category_id: varchar('applicable_category_id', { length: 255 }),
  created_by: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const coupon_usages = pgTable('coupon_usages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  coupon_id: varchar('coupon_id', { length: 255 }).notNull(),
  customer_id: uuid('customer_id').notNull(),
  order_id: varchar('order_id', { length: 255 }).notNull(),
  discount_amount: numeric('discount_amount').notNull(),
  used_at: timestamp('used_at').defaultNow(),
});

export const app_settings = pgTable('app_settings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  site_name: varchar('site_name', { length: 255 }).default('Unx Games'),
  app_tagline: text('app_tagline').default("Nepal's #1 Instant Gaming Top-Up Platform"),
  logo_url: text('logo_url'),
  support_phone: varchar('support_phone', { length: 50 }).default('9768914027'),
  whatsapp_number: varchar('whatsapp_number', { length: 50 }).default('9768914027'),
  viber_number: varchar('viber_number', { length: 50 }).default('9768914027'),
  support_email: varchar('support_email', { length: 255 }).default('hii.binodthalal@gmail.com'),
  company_address: text('company_address').default('Deelasaini-6, Baitadi, Nepal'),
  maintenance_mode: boolean('maintenance_mode').default(false),
  ordering_enabled: boolean('ordering_enabled').default(true),
  maintenance_message: text('maintenance_message').default('Top-up service is temporarily unavailable due to maintenance.'),
  maintenance_until: timestamp('maintenance_until'),
  maintenance_duration_minutes: integer('maintenance_duration_minutes'),
  announcement_ticker: jsonb('announcement_ticker'),
  terms_and_conditions: text('terms_and_conditions'),
  privacy_policy: text('privacy_policy'),
  r2_account_id: text('r2_account_id'),
  r2_bucket_name: text('r2_bucket_name'),
  r2_public_domain: text('r2_public_domain'),
  r2_access_key_id: text('r2_access_key_id'),
  r2_secret_access_key: text('r2_secret_access_key'),
  business_registration_number: varchar('business_registration_number', { length: 100 }),
  business_pan: varchar('business_pan', { length: 50 }),
  vat_number: varchar('vat_number', { length: 50 }),
  complaint_contact: text('complaint_contact'),
  responsible_business_info: text('responsible_business_info'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const cancellation_requests = pgTable('cancellation_requests', {
  id: varchar('id', { length: 255 }).primaryKey(),
  order_id: varchar('order_id', { length: 255 }).notNull(),
  customer_id: uuid('customer_id').references(() => customers.id),
  reason: text('reason'),
  status: varchar('status', { length: 50 }).default('pending'),
  refund_method: varchar('refund_method', { length: 50 }),
  refund_details: text('refund_details'),
  refund_status: varchar('refund_status', { length: 50 }),
  refund_amount: numeric('refund_amount'),
  refund_proof_url: text('refund_proof_url'),
  admin_notes: text('admin_notes'),
  requested_at: timestamp('requested_at').defaultNow(),
  resolved_at: timestamp('resolved_at'),
  resolved_by: varchar('resolved_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const refunds = pgTable('refunds', {
  id: varchar('id', { length: 255 }).primaryKey(),
  order_id: varchar('order_id', { length: 255 }).notNull(),
  customer_id: uuid('customer_id').references(() => customers.id),
  amount: numeric('amount').notNull(),
  currency: varchar('currency', { length: 10 }).default('NPR'),
  refund_method: varchar('refund_method', { length: 50 }).default('WALLET'),
  status: varchar('status', { length: 50 }).default('COMPLETED'),
  reason: text('reason'),
  proof_url: text('proof_url'),
  processed_by: varchar('processed_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const kyc_documents = pgTable('kyc_documents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id),
  doc_type: varchar('doc_type', { length: 100 }).notNull(),
  doc_number: varchar('doc_number', { length: 255 }),
  document_url: text('document_url').notNull(),
  r2_key: text('r2_key'),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const kyc_reviews = pgTable('kyc_reviews', {
  id: varchar('id', { length: 255 }).primaryKey(),
  kyc_document_id: varchar('kyc_document_id', { length: 255 }),
  customer_id: uuid('customer_id').notNull().references(() => customers.id),
  action: varchar('action', { length: 50 }).notNull(),
  reviewer_id: varchar('reviewer_id', { length: 255 }).notNull(),
  reviewer_name: varchar('reviewer_name', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const media_assets = pgTable('media_assets', {
  id: varchar('id', { length: 255 }).primaryKey(),
  storage_provider: varchar('storage_provider', { length: 50 }).default('cloudflare_r2'),
  bucket: varchar('bucket', { length: 255 }).notNull(),
  object_key: text('object_key').notNull().unique(),
  public_url: text('public_url'),
  media_type: varchar('media_type', { length: 100 }),
  file_size: integer('file_size'),
  source_table: varchar('source_table', { length: 100 }),
  source_id: varchar('source_id', { length: 255 }),
  uploaded_by: varchar('uploaded_by', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 21. PAYMENT PROOFS
export const payment_proofs = pgTable('payment_proofs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  order_id: varchar('order_id', { length: 255 }),
  payment_id: varchar('payment_id', { length: 255 }),
  customer_id: uuid('customer_id').references(() => customers.id),
  r2_key: text('r2_key'),
  proof_url: text('proof_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 22. LEGAL PAGES
export const legal_pages = pgTable('legal_pages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  slug: varchar('slug', { length: 255 }).unique(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  isPublished: boolean('is_published').default(true),
  version: varchar('version', { length: 50 }).default('1.0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 23. MAINTENANCE SETTINGS
export const maintenance_settings = pgTable('maintenance_settings', {
  id: varchar('id', { length: 50 }).primaryKey().default('main'),
  enabled: boolean('enabled').default(false),
  message: text('message').default('System is under maintenance. Please try again later.'),
  until: timestamp('until'),
  duration_minutes: integer('duration_minutes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 24. SUPPORT TICKETS
export const support_tickets = pgTable('support_tickets', {
  id: varchar('id', { length: 255 }).primaryKey(),
  ticket_number: varchar('ticket_number', { length: 100 }).unique(),
  customer_id: uuid('customer_id').references(() => customers.id),
  order_id: varchar('order_id', { length: 255 }),
  customer_name: varchar('customer_name', { length: 255 }).notNull(),
  customer_email: varchar('customer_email', { length: 255 }).notNull(),
  customer_phone: varchar('customer_phone', { length: 50 }),
  subject: varchar('subject', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).default('General Inquiry'),
  status: varchar('status', { length: 50 }).default('pending'),
  priority: varchar('priority', { length: 50 }).default('NORMAL'),
  admin_reply: text('admin_reply'),
  replied_at: timestamp('replied_at'),
  replied_by: varchar('replied_by', { length: 255 }),
  resolved_at: timestamp('resolved_at'),
  closed_at: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 25. SUPPORT MESSAGES
export const support_messages = pgTable('support_messages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  ticket_id: varchar('ticket_id', { length: 255 }).notNull().references(() => support_tickets.id),
  sender_type: varchar('sender_type', { length: 50 }).notNull(),
  sender_id: varchar('sender_id', { length: 255 }),
  sender_name: varchar('sender_name', { length: 255 }).notNull(),
  message: text('message').notNull(),
  attachment_url: text('attachment_url'),
  attachment_r2_key: text('attachment_r2_key'),
  is_internal_note: boolean('is_internal_note').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 26. WALLETS
export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  customer_id: uuid('customer_id').references(() => customers.id).notNull().unique(),
  balance: numeric('balance').default('0.00').notNull(),
  currency: varchar('currency', { length: 10 }).default('NPR'),
  status: varchar('status', { length: 50 }).default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 27. WALLET TRANSACTIONS
export const wallet_transactions = pgTable('wallet_transactions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  wallet_id: uuid('wallet_id').references(() => wallets.id).notNull(),
  customer_id: uuid('customer_id').references(() => customers.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  amount: numeric('amount').notNull(),
  balance_before: numeric('balance_before').notNull(),
  balance_after: numeric('balance_after').notNull(),
  status: varchar('status', { length: 50 }).default('COMPLETED'),
  payment_method: varchar('payment_method', { length: 50 }),
  reference: varchar('reference', { length: 255 }),
  description: text('description'),
  order_id: varchar('order_id', { length: 255 }),
  admin_verified: boolean('admin_verified').default(false),
  admin_verified_by: varchar('admin_verified_by', { length: 255 }),
  admin_notes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 28. RATE LIMITS
export const rate_limits = pgTable('rate_limits', {
  key: varchar('key', { length: 255 }).primaryKey(),
  count: integer('count').notNull().default(1),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 29. SECURITY INCIDENTS
export const security_incidents = pgTable('security_incidents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  incident_number: varchar('incident_number', { length: 100 }).unique(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(), // FRAUD_DETECTED, BRUTE_FORCE, PAYMENT_ANOMALY, WALLET_ANOMALY, NEW_DEVICE, RATE_LIMIT, AUTH_FAILURE
  severity: varchar('severity', { length: 50 }).notNull().default('LOW'), // LOW, MEDIUM, HIGH, CRITICAL
  status: varchar('status', { length: 50 }).notNull().default('OPEN'), // OPEN, INVESTIGATING, RESOLVED, FALSE_POSITIVE
  user_id: uuid('user_id').references(() => customers.id),
  ip_address: varchar('ip_address', { length: 100 }),
  resource_type: varchar('resource_type', { length: 100 }),
  resource_id: varchar('resource_id', { length: 255 }),
  description: text('description'),
  risk_score: integer('risk_score').default(0),
  metadata: jsonb('metadata'),
  resolution_notes: text('resolution_notes'),
  resolved_by: varchar('resolved_by', { length: 255 }),
  resolved_at: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 30. RISK SCORES
export const risk_scores = pgTable('risk_scores', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: uuid('user_id').references(() => customers.id),
  ip_address: varchar('ip_address', { length: 100 }),
  score: integer('score').notNull().default(0),
  level: varchar('level', { length: 50 }).notNull().default('LOW'), // LOW, MEDIUM, HIGH, CRITICAL
  signals: jsonb('signals'),
  last_evaluated_at: timestamp('last_evaluated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 31. FEATURE FLAGS
export const feature_flags = pgTable('feature_flags', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(false).notNull(),
  environment: varchar('environment', { length: 50 }).default('production'),
  rollout_percentage: integer('rollout_percentage').default(100),
  updated_by: varchar('updated_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 32. TEAM APPLICATIONS
export const team_applications = pgTable('team_applications', {
  id: varchar('id', { length: 255 }).primaryKey(), // Formatted GHN-TEAM-XXXXXXXX
  user_id: uuid('user_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  full_name: varchar('full_name', { length: 255 }),
  gamer_username: varchar('gamer_username', { length: 255 }),
  email: varchar('email', { length: 255 }),
  mobile_number: varchar('mobile_number', { length: 100 }),
  role_applied_for: varchar('role_applied_for', { length: 100 }).notNull(),
  gaming_experience: text('gaming_experience'),
  games_played: text('games_played'),
  game_uid: varchar('game_uid', { length: 255 }),
  discord_username: varchar('discord_username', { length: 255 }),
  why_join: text('why_join'),
  skills: text('skills'),
  availability: varchar('availability', { length: 255 }),
  profile_image_url: text('profile_image_url'),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, UNDER_REVIEW, SHORTLISTED, APPROVED, REJECTED, WITHDRAWN
  stage: varchar('stage', { length: 100 }).default('INITIAL_SUBMISSION'),
  current_reviewer_id: varchar('current_reviewer_id', { length: 255 }),
  current_reviewer_name: varchar('current_reviewer_name', { length: 255 }),
  internal_notes: text('internal_notes'),
  applied_at: timestamp('applied_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  reviewed_at: timestamp('reviewed_at'),
  reviewed_by: varchar('reviewed_by', { length: 255 }),
});

// 33. TEAM OFFICERS
export const team_officers = pgTable('team_officers', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: uuid('user_id').references(() => customers.id, { onDelete: 'cascade' }).notNull().unique(),
  full_name: varchar('full_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  mobile: varchar('mobile', { length: 100 }),
  title: varchar('title', { length: 255 }).default('Team Officer'),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  assigned_by: varchar('assigned_by', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 34. TEAM MEMBERS
export const team_members = pgTable('team_members', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: uuid('user_id').references(() => customers.id, { onDelete: 'cascade' }).notNull().unique(),
  full_name: varchar('full_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  mobile: varchar('mobile', { length: 100 }),
  role: varchar('role', { length: 100 }).default('MEMBER'),
  position_title: varchar('position_title', { length: 255 }).default('Team Member'),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  location: varchar('location', { length: 255 }),
  avatar_url: text('avatar_url'),
  is_owner: boolean('is_owner').default(false),
  joined_at: timestamp('joined_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
});

// 35. TEAM APPLICATION REVIEWS
export const team_application_reviews = pgTable('team_application_reviews', {
  id: varchar('id', { length: 255 }).primaryKey(),
  application_id: varchar('application_id', { length: 255 }).references(() => team_applications.id, { onDelete: 'cascade' }).notNull(),
  reviewer_id: varchar('reviewer_id', { length: 255 }).notNull(),
  reviewer_name: varchar('reviewer_name', { length: 255 }),
  reviewer_role: varchar('reviewer_role', { length: 100 }),
  previous_status: varchar('previous_status', { length: 50 }),
  new_status: varchar('new_status', { length: 50 }).notNull(),
  review_note: text('review_note'),
  created_at: timestamp('created_at').defaultNow(),
});

// 37. TEAM ACTIVITY LOGS
export const team_activity_logs = pgTable('team_activity_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  actor_id: varchar('actor_id', { length: 255 }),
  actor_name: varchar('actor_name', { length: 255 }),
  actor_role: varchar('actor_role', { length: 100 }),
  action: varchar('action', { length: 255 }).notNull(),
  resource_id: varchar('resource_id', { length: 255 }),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
});

// 38. TEAM NOTIFICATIONS
export const team_notifications = pgTable('team_notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: uuid('user_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 100 }).default('APPLICATION_STATUS'),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// 39. TEAM SETTINGS
export const team_settings = pgTable('team_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  description: text('description'),
  updated_by: varchar('updated_by', { length: 255 }),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 37. REVIEW SETTINGS TABLE (AI Auto-Reply Configuration)
export const review_settings = pgTable('review_settings', {
  id: varchar('id', { length: 50 }).primaryKey().default('default'),
  auto_reply_enabled: boolean('auto_reply_enabled').default(true),
  reply_tone: varchar('reply_tone', { length: 50 }).default('professional'),
  signature: varchar('signature', { length: 255 }).default('— Unx Games Team 🎮'),
  min_rating_to_reply: integer('min_rating_to_reply').default(1),
  custom_prompt_instructions: text('custom_prompt_instructions'),
  updatedAt: timestamp('updated_at').defaultNow(),
});




export const roles = pgTable('roles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  is_system: boolean('is_system').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const permissions = pgTable('permissions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow()
});

export const role_permissions = pgTable('role_permissions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  role_id: varchar('role_id', { length: 50 }).references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permission_id: varchar('permission_id', { length: 100 }).references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  created_at: timestamp('created_at').defaultNow()
});

export const personnel_roles = pgTable('personnel_roles', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: varchar('user_id', { length: 255 }).references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  role_id: varchar('role_id', { length: 50 }).references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  assigned_by: varchar('assigned_by', { length: 255 }),
  created_at: timestamp('created_at').defaultNow()
});

export const role_audit_logs = pgTable('role_audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  actor_id: varchar('actor_id', { length: 255 }),
  actor_role: varchar('actor_role', { length: 100 }),
  target_user_id: varchar('target_user_id', { length: 255 }),
  action: varchar('action', { length: 255 }).notNull(),
  previous_role: varchar('previous_role', { length: 100 }),
  new_role: varchar('new_role', { length: 100 }),
  reason: text('reason'),
  ip_address: varchar('ip_address', { length: 100 }),
  created_at: timestamp('created_at').defaultNow()
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  user_id: varchar('user_id', { length: 255 }),
  session_token_hash: varchar('session_token_hash', { length: 255 }),
  ip_address: varchar('ip_address', { length: 100 }),
  user_agent: text('user_agent'),
  device_type: varchar('device_type', { length: 50 }),
  browser: varchar('browser', { length: 100 }),
  os: varchar('os', { length: 100 }),
  location_approx: varchar('location_approx', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  expires_at: timestamp('expires_at'),
  last_activity_at: timestamp('last_activity_at').defaultNow(),
  revoked_at: timestamp('revoked_at'),
});

export const system_events = pgTable('system_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  event_type: varchar('event_type', { length: 100 }),
  severity: varchar('severity', { length: 50 }),
  actor_id: varchar('actor_id', { length: 255 }),
  entity_type: varchar('entity_type', { length: 100 }),
  entity_id: varchar('entity_id', { length: 255 }),
  message: text('message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});
