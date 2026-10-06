-- ==============================================================================
-- Unx Games - Complete Authoritative Relational Database Schema (PostgreSQL)
-- Covers All Systems: Storefront, Admin Panel, RBAC, Wallets, Teams, Security, AI
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CUSTOMERS / USERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id UUID,
    supabase_auth_user_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    security_pin VARCHAR(255),
    uid VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile VARCHAR(50),
    username VARCHAR(255) UNIQUE,
    gamer_id VARCHAR(255),
    game_uids JSONB DEFAULT '[]'::jsonb,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    mobile_verified BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'CUSTOMER',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    setup_completed BOOLEAN DEFAULT false,
    setup_step INTEGER DEFAULT 1,
    favorite_games JSONB DEFAULT '[]'::jsonb,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    location VARCHAR(255),
    address TEXT,
    district VARCHAR(100),
    city VARCHAR(100),
    two_factor_enabled BOOLEAN DEFAULT false,
    account_verified BOOLEAN DEFAULT false,
    verification_status VARCHAR(50) DEFAULT 'unverified',
    verification_doc_type VARCHAR(100),
    verification_doc_number VARCHAR(255),
    verification_submitted_at TIMESTAMP,
    verification_notes TEXT,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_username ON customers(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_customers_role_status ON customers(role, status);

-- View for compatibility with legacy queries referencing "users" (with security_invoker = true to satisfy Supabase security advisor)
DROP VIEW IF EXISTS users CASCADE;
CREATE VIEW users WITH (security_invoker = true) AS SELECT * FROM customers;

-- ==============================================================================
-- 4. SESSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(64) NOT NULL,
    session_token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    location_approx VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. CATALOG: CATEGORIES, GAMES, PRODUCTS & PACKAGES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    icon_url TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    publisher VARCHAR(255),
    description TEXT,
    short_description TEXT,
    category_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    banner_url TEXT,
    platform VARCHAR(100),
    region VARCHAR(100),
    required_fields JSONB,
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    short_description TEXT,
    category_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
    game_id VARCHAR(255) REFERENCES games(id) ON DELETE SET NULL,
    image_url TEXT,
    banner_url TEXT,
    r2_key TEXT,
    currency VARCHAR(10) DEFAULT 'NPR',
    region VARCHAR(100),
    delivery_type VARCHAR(50),
    required_fields JSONB,
    featured BOOLEAN DEFAULT false,
    popular BOOLEAN DEFAULT false,
    best_value BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    archived BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_packages (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    unit VARCHAR(50),
    price NUMERIC NOT NULL,
    compare_at_price NUMERIC,
    discount NUMERIC,
    badge VARCHAR(100),
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prod_packages_prod_id ON product_packages(product_id);

-- ==============================================================================
-- 7. ORDERS, PAYMENTS & AUDIT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE,
    order_number VARCHAR(255) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id VARCHAR(255) REFERENCES products(id) ON DELETE SET NULL,
    package_id VARCHAR(255) REFERENCES product_packages(id) ON DELETE SET NULL,
    game_id VARCHAR(255) REFERENCES games(id) ON DELETE SET NULL,
    customer_name_snapshot VARCHAR(255),
    customer_email_snapshot VARCHAR(255),
    customer_mobile_snapshot VARCHAR(50),
    game_uid VARCHAR(255),
    game_server VARCHAR(255),
    game_username VARCHAR(255),
    region VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC,
    discount NUMERIC DEFAULT 0,
    coupon_id VARCHAR(255),
    coupon_code_snapshot VARCHAR(255),
    coupon_discount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'NPR',
    payment_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending_verification',
    order_status VARCHAR(50) DEFAULT 'pending_payment',
    notes TEXT,
    admin_notes TEXT,
    admin_verified_by VARCHAR(255),
    assigned_to VARCHAR(255),
    internal_status VARCHAR(50),
    estimated_delivery_minutes INTEGER,
    cancellation_reason TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_status_history (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history(order_id);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    method VARCHAR(50),
    amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'NPR',
    transaction_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    proof_url TEXT,
    proof_r2_key TEXT,
    customer_note TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

CREATE TABLE IF NOT EXISTS payment_proofs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255) NOT NULL,
    payment_id VARCHAR(255),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    proof_url TEXT NOT NULL,
    proof_r2_key TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    method VARCHAR(50),
    enabled BOOLEAN DEFAULT true,
    qr_enabled BOOLEAN DEFAULT true,
    esewa_enabled BOOLEAN DEFAULT true,
    khalti_enabled BOOLEAN DEFAULT true,
    imepay_enabled BOOLEAN DEFAULT true,
    bank_enabled BOOLEAN DEFAULT true,
    esewa_name VARCHAR(255) DEFAULT 'Unx Games',
    khalti_name VARCHAR(255) DEFAULT 'Unx Games',
    imepay_name VARCHAR(255) DEFAULT 'Unx Games',
    esewa_id VARCHAR(255) DEFAULT '9768914027',
    khalti_id VARCHAR(255) DEFAULT '9768914027',
    imepay_id VARCHAR(255) DEFAULT '9768914027',
    esewa_qr TEXT,
    khalti_qr TEXT,
    imepay_qr TEXT,
    bank_name VARCHAR(255),
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_qr TEXT,
    display_name VARCHAR(255),
    account_name VARCHAR(255),
    account_number VARCHAR(255),
    merchant_id VARCHAR(255),
    instructions TEXT,
    qr_image_url TEXT,
    qr_r2_key TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cancellation_requests (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    refund_method VARCHAR(50),
    refund_details TEXT,
    admin_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS refunds (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'NPR',
    refund_method VARCHAR(50) DEFAULT 'WALLET',
    status VARCHAR(50) DEFAULT 'COMPLETED',
    reason TEXT,
    proof_url TEXT,
    processed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_documents (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    doc_number VARCHAR(255),
    document_url TEXT NOT NULL,
    r2_key TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_reviews (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    kyc_document_id VARCHAR(255) REFERENCES kyc_documents(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    reviewer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    storage_provider VARCHAR(50) DEFAULT 'cloudflare_r2',
    bucket VARCHAR(255) NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    public_url TEXT,
    media_type VARCHAR(100),
    file_size INTEGER,
    source_table VARCHAR(100),
    source_id VARCHAR(255),
    uploaded_by VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. WALLETS & TRANSACTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'NPR',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_customer ON wallets(customer_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    payment_method VARCHAR(50),
    reference VARCHAR(255),
    description TEXT,
    order_id VARCHAR(255),
    admin_verified BOOLEAN DEFAULT false,
    admin_verified_by VARCHAR(255),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer ON wallet_transactions(customer_id);

-- ==============================================================================
-- 9. CONTENT: BANNERS, OFFERS, NEWS, REVIEWS & SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS banners (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255),
    subtitle TEXT,
    badge VARCHAR(100),
    button_text VARCHAR(100),
    type VARCHAR(50) DEFAULT 'hero',
    action_type VARCHAR(50),
    action_target TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    r2_key TEXT,
    link_type VARCHAR(50),
    link_value TEXT,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    r2_key TEXT,
    product_id VARCHAR(255) REFERENCES products(id) ON DELETE SET NULL,
    discount NUMERIC,
    active BOOLEAN DEFAULT true,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    category VARCHAR(100) DEFAULT 'News',
    tag VARCHAR(100) DEFAULT 'General',
    summary TEXT,
    content TEXT,
    image_url TEXT,
    r2_key TEXT,
    author VARCHAR(255) DEFAULT 'Unx Games Team',
    author_id VARCHAR(255),
    published BOOLEAN DEFAULT true,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255),
    recipient_role VARCHAR(50),
    recipient_uid VARCHAR(255),
    customer_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_global BOOLEAN DEFAULT false,
    type VARCHAR(50),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255),
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    user_photo TEXT,
    product_id VARCHAR(255),
    product_name VARCHAR(255),
    product_image TEXT,
    package_name VARCHAR(255),
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT,
    is_verified_buyer BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'published',
    user_location VARCHAR(255),
    admin_reply TEXT,
    admin_reply_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    auto_reply_enabled BOOLEAN DEFAULT true,
    reply_tone VARCHAR(50) DEFAULT 'professional',
    signature VARCHAR(255) DEFAULT '— Unx Games Team 🎮',
    min_rating_to_reply INTEGER DEFAULT 1,
    custom_prompt_instructions TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(255) PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    description TEXT,
    discount_type VARCHAR(50) DEFAULT 'PERCENTAGE',
    discount_value NUMERIC DEFAULT 10,
    discount_percentage NUMERIC DEFAULT 10,
    minimum_order_amount NUMERIC DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount_amount NUMERIC,
    usage_limit INTEGER DEFAULT 999999999,
    usage_per_customer INTEGER DEFAULT 999999999,
    used_count INTEGER DEFAULT 0,
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_usages (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    coupon_id VARCHAR(255) NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL,
    discount_amount NUMERIC NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    site_name VARCHAR(255) DEFAULT 'Unx Games',
    app_tagline TEXT DEFAULT 'Nepal''s #1 Trusted Gaming Top-Up Platform',
    logo_url TEXT,
    favicon_url TEXT,
    support_email VARCHAR(255) DEFAULT 'hii.binodthalal@gmail.com',
    support_phone VARCHAR(50) DEFAULT '9768914027',
    whatsapp_number VARCHAR(50) DEFAULT '9768914027',
    viber_number VARCHAR(50) DEFAULT '9768914027',
    company_address TEXT DEFAULT 'Deelasaini-6, Baitadi, Nepal',
    terms_and_conditions TEXT,
    privacy_policy TEXT,
    maintenance_until TIMESTAMP,
    maintenance_duration_minutes INTEGER,
    r2_account_id TEXT,
    r2_access_key_id TEXT,
    r2_secret_access_key TEXT,
    r2_bucket_name TEXT,
    r2_public_domain TEXT,
    business_registration_number VARCHAR(255),
    business_pan VARCHAR(255),
    vat_number VARCHAR(255),
    complaint_contact TEXT,
    responsible_business_info TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(50) PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS legal_pages (
    id VARCHAR(255) PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    is_published BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS maintenance_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    enabled BOOLEAN DEFAULT false,
    message TEXT,
    until TIMESTAMP,
    duration_minutes INTEGER,
    allowed_ips TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- ==============================================================================
-- 10. SUPPORT SYSTEM
-- ==============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ticket_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    order_id VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);

CREATE TABLE IF NOT EXISTS support_messages (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ticket_id VARCHAR(255) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_msgs_ticket ON support_messages(ticket_id);

-- ==============================================================================
-- 11. SECURITY, SESSIONS & LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actor_id VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_limits (
    key VARCHAR(255) PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_incidents (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    incident_number VARCHAR(100) UNIQUE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'LOW',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    ip_address VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    description TEXT,
    risk_score INTEGER DEFAULT 0,
    metadata JSONB,
    resolution_notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sec_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_sec_incidents_severity ON security_incidents(severity);

CREATE TABLE IF NOT EXISTS risk_scores (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    ip_address VARCHAR(100),
    score INTEGER NOT NULL DEFAULT 0,
    level VARCHAR(50) NOT NULL DEFAULT 'LOW',
    signals JSONB,
    last_evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    environment VARCHAR(50) DEFAULT 'production',
    rollout_percentage INTEGER DEFAULT 100,
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 12. TEAM SYSTEM (APPLICATIONS, OFFICERS, MEMBERS & REVIEWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS team_applications (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    gamer_username VARCHAR(255),
    email VARCHAR(255),
    mobile_number VARCHAR(100),
    role_applied_for VARCHAR(100) NOT NULL,
    gaming_experience TEXT,
    games_played TEXT,
    game_uid VARCHAR(255),
    discord_username VARCHAR(255),
    why_join TEXT,
    skills TEXT,
    availability VARCHAR(255),
    profile_image_url TEXT,
    experience_notes TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    stage VARCHAR(100) DEFAULT 'INITIAL_SUBMISSION',
    current_reviewer_id VARCHAR(255),
    current_reviewer_name VARCHAR(255),
    internal_notes TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_apps_user ON team_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_apps_status ON team_applications(status);

CREATE TABLE IF NOT EXISTS team_officers (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(100),
    title VARCHAR(255) DEFAULT 'Team Officer',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    assigned_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(100),
    role VARCHAR(100) DEFAULT 'MEMBER',
    position_title VARCHAR(255) DEFAULT 'Team Member',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    location VARCHAR(255),
    avatar_url TEXT,
    is_owner BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_application_reviews (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    application_id VARCHAR(255) NOT NULL REFERENCES team_applications(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(255) NOT NULL,
    reviewer_name VARCHAR(255),
    reviewer_role VARCHAR(100),
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_officer_permissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    granted_by VARCHAR(255),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_activity_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actor_id VARCHAR(255),
    actor_name VARCHAR(255),
    actor_role VARCHAR(100),
    action VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_notifications (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'APPLICATION_STATUS',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 13. NORMALIZED RBAC ROLES & PERMISSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY,
    key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy_level INTEGER NOT NULL DEFAULT 1,
    is_system_role BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role_id VARCHAR(100) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personnel_roles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 14. DEFAULT SEED DATA
-- ==============================================================================

-- Seed RBAC System Roles
INSERT INTO roles (id, key, name, description, hierarchy_level, is_system_role)
VALUES 
    ('SUPPORT_STAFF', 'SUPPORT_STAFF', 'Support Staff', 'Customer support, support tickets, order viewing and basic verification', 1, true),
    ('STORE_MANAGER', 'STORE_MANAGER', 'Store Manager', 'Store operations, sales fulfillment, catalog, reviews and order processing', 2, true),
    ('SUPER_ADMIN', 'SUPER_ADMIN', 'Super Admin', 'Full operational management, user management, security monitoring, reports and analytics', 3, true),
    ('STORE_OWNER', 'STORE_OWNER', 'Store Owner', 'Supreme owner authority with complete platform controls and governance', 4, true)
ON CONFLICT (id) DO UPDATE SET 
    key = EXCLUDED.key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level;

-- Seed RBAC System Permissions
INSERT INTO permissions (id, key, name, description, resource, action)
VALUES
    ('team.dashboard.view', 'team.dashboard.view', 'View Team Dashboard', 'Access team summary metrics and overview', 'team', 'view'),
    ('team.applications.view', 'team.applications.view', 'View Applications', 'View list of team applications', 'team', 'view'),
    ('team.applications.review', 'team.applications.review', 'Review Applications', 'Add notes and change application stage', 'team', 'review'),
    ('team.applications.approve', 'team.applications.approve', 'Approve Applications', 'Approve applicants and assign role', 'team', 'approve'),
    ('team.applications.reject', 'team.applications.reject', 'Reject Applications', 'Reject team applications', 'team', 'reject'),
    ('team.members.view', 'team.members.view', 'View Team Members', 'View active officer and member directory', 'team', 'view'),
    ('team.members.manage', 'team.members.manage', 'Manage Members', 'Manage active team member positions and roles', 'team', 'manage'),
    ('team.officers.view', 'team.officers.view', 'View Officers', 'View list of active team officers', 'team', 'view'),
    ('team.officers.manage', 'team.officers.manage', 'Manage Officers', 'Create, update, or deactivate team officers', 'team', 'manage'),
    ('team.notifications.send', 'team.notifications.send', 'Send Team Notifications', 'Broadcast notifications to team applicants and members', 'team', 'send'),
    ('team.settings.view', 'team.settings.view', 'View Team Settings', 'View team module settings', 'team', 'view'),
    ('team.settings.manage', 'team.settings.manage', 'Manage Team Settings', 'Modify team operational rules and settings', 'team', 'manage'),
    ('team.audit.view', 'team.audit.view', 'View Team Audit Logs', 'Inspect team activity and audit history', 'team', 'view')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Seed Default Feature Flags
INSERT INTO feature_flags (id, name, description, enabled, environment)
VALUES
    ('flag-newCheckout', 'newCheckout', 'Enable stream-lined high reliability checkout', true, 'production'),
    ('flag-newWalletUI', 'newWalletUI', 'Enable modern wallet UI & ledger view', true, 'production'),
    ('flag-newSecurityCenter', 'newSecurityCenter', 'Enable Next-Gen Admin Security Center & Incident Dashboard', true, 'production'),
    ('flag-newNewsUI', 'newNewsUI', 'Enable interactive news feed & updates UI', true, 'production')
ON CONFLICT (name) DO NOTHING;

-- Seed Default Review Settings
INSERT INTO review_settings (id, auto_reply_enabled, reply_tone, signature, min_rating_to_reply)
VALUES ('default', true, 'professional', '— Unx Games Team 🎮', 1)
ON CONFLICT (id) DO NOTHING;

-- Seed App Settings
INSERT INTO app_settings (id, site_name, logo_url, support_phone, whatsapp_number, viber_number, support_email, company_address, r2_account_id, r2_bucket_name, r2_public_domain, updated_at)
VALUES ('default', 'Unx Games', 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png', '9768914027', '9768914027', '9768914027', 'hii.binodthalal@gmail.com', 'Deelasaini-6, Baitadi, Nepal', NULL, NULL, NULL, NOW())
ON CONFLICT (id) DO UPDATE SET logo_url = EXCLUDED.logo_url;

-- Seed Payment Settings
INSERT INTO payment_settings (id, qr_enabled, esewa_name, khalti_name, imepay_name, esewa_id, khalti_id, imepay_id, esewa_enabled, khalti_enabled, imepay_enabled, bank_enabled, esewa_qr, khalti_qr, updated_at)
VALUES ('default', true, 'Unx Games', 'Unx Games', 'Unx Games', '9768914027', '9768914027', '9768914027', true, true, true, true, 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Esewa.png', 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Khalti.jpg', NOW())
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- SECURITY HARDENING (Supabase Security Advisor Compliance)
-- ==============================================================================
-- Ensure users view is security invoker (resolves Security Definer View error)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'users') THEN
        ALTER VIEW public.users SET (security_invoker = true);
    END IF;
END $$;

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enable RLS across core application tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin/manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.customers
        WHERE (customers.supabase_user_id = auth.uid() OR customers.supabase_auth_user_id = auth.uid()::text)
          AND customers.role IN ('STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Customers RLS: Users can read and update their own profile; Admins can read all
DROP POLICY IF EXISTS "Customers: user can view own profile" ON customers;
CREATE POLICY "Customers: user can view own profile" ON customers
    FOR SELECT USING (auth.uid() = supabase_user_id OR auth.uid()::text = supabase_auth_user_id OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Customers: user can update own profile" ON customers;
CREATE POLICY "Customers: user can update own profile" ON customers
    FOR UPDATE USING (auth.uid() = supabase_user_id OR auth.uid()::text = supabase_auth_user_id OR public.is_admin_or_manager());

-- 2. Orders RLS: Users can view own orders; Admins can view/update all
DROP POLICY IF EXISTS "Orders: user can view own orders" ON orders;
CREATE POLICY "Orders: user can view own orders" ON orders
    FOR SELECT USING (
        user_id = auth.uid()::text 
        OR customer_id = auth.uid()
        OR public.is_admin_or_manager()
    );

-- 3. Wallets RLS: Users can view own wallet; Admins can view/update
DROP POLICY IF EXISTS "Wallets: user can view own wallet" ON wallets;
CREATE POLICY "Wallets: user can view own wallet" ON wallets
    FOR SELECT USING (
        user_id = auth.uid()::text 
        OR customer_id = auth.uid()
        OR public.is_admin_or_manager()
    );

-- 4. Wallet Transactions RLS: Users can view own transactions; Admins can view all
DROP POLICY IF EXISTS "Wallet Transactions: user can view own" ON wallet_transactions;
CREATE POLICY "Wallet Transactions: user can view own" ON wallet_transactions
    FOR SELECT USING (
        user_id = auth.uid()::text 
        OR customer_id = auth.uid()
        OR public.is_admin_or_manager()
    );

-- 5. Notifications RLS: Users can view own notifications
DROP POLICY IF EXISTS "Notifications: user can view own" ON notifications;
CREATE POLICY "Notifications: user can view own" ON notifications
    FOR SELECT USING (
        user_id = auth.uid()::text 
        OR customer_id = auth.uid()
        OR public.is_admin_or_manager()
    );

-- 6. Public Catalog RLS: Anyone can view active categories, games, products, banners, offers
DROP POLICY IF EXISTS "Catalog: public can view categories" ON categories;
CREATE POLICY "Catalog: public can view categories" ON categories FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view games" ON games;
CREATE POLICY "Catalog: public can view games" ON games FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view products" ON products;
CREATE POLICY "Catalog: public can view products" ON products FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view packages" ON game_packages;
CREATE POLICY "Catalog: public can view packages" ON game_packages FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view banners" ON banners;
CREATE POLICY "Catalog: public can view banners" ON banners FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view offers" ON offers;
CREATE POLICY "Catalog: public can view offers" ON offers FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view coupons" ON coupons;
CREATE POLICY "Catalog: public can view coupons" ON coupons FOR SELECT USING (active = true OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "Catalog: public can view legal" ON legal_pages;
CREATE POLICY "Catalog: public can view legal" ON legal_pages FOR SELECT USING (is_published = true OR public.is_admin_or_manager());


