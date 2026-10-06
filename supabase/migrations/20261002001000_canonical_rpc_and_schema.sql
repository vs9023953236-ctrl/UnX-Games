-- 20261002001000_canonical_rpc_and_schema.sql
-- Game Hub Nepal: Canonical Tables & Secure Supabase RPC Procedures
-- Defines canonical tables: refunds, kyc_documents, kyc_reviews, media_assets
-- Defines secure RPC functions:
--   ghn_validate_coupon
--   ghn_adjust_wallet
--   ghn_submit_wallet_deposit
--   ghn_review_wallet_deposit
--   ghn_create_order / ghn_place_order
--   ghn_submit_payment
--   ghn_verify_payment
--   ghn_update_order_status
--   ghn_update_inventory
--   ghn_request_cancellation
--   ghn_resolve_cancellation
--   ghn_process_refund
--   ghn_submit_kyc
--   ghn_review_kyc
--   ghn_create_support_ticket
--   ghn_add_support_message

-- 1. CANONICAL TABLES & CUSTOMER ID HARMONIZATION
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'supabase_user_id'
    ) THEN
      ALTER TABLE public.customers ADD COLUMN supabase_user_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'supabase_auth_user_id'
    ) THEN
      ALTER TABLE public.customers ADD COLUMN supabase_auth_user_id VARCHAR(255);
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_sync_customer_supabase_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supabase_user_id IS NOT NULL AND (NEW.supabase_auth_user_id IS NULL OR NEW.supabase_auth_user_id = '') THEN
    NEW.supabase_auth_user_id := NEW.supabase_user_id::text;
  ELSIF NEW.supabase_auth_user_id IS NOT NULL AND NEW.supabase_auth_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND NEW.supabase_user_id IS NULL THEN
    NEW.supabase_user_id := NEW.supabase_auth_user_id::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    DROP TRIGGER IF EXISTS trg_sync_customer_supabase_ids ON public.customers;
    CREATE TRIGGER trg_sync_customer_supabase_ids
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_customer_supabase_ids();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cancellation_requests (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    refund_method VARCHAR(50),
    refund_details TEXT,
    refund_status VARCHAR(50),
    refund_amount NUMERIC,
    refund_proof_url TEXT,
    admin_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_order ON public.cancellation_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_customer ON public.cancellation_requests(customer_id);

CREATE TABLE IF NOT EXISTS public.refunds (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON public.refunds(customer_id);

CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    doc_number VARCHAR(255),
    document_url TEXT NOT NULL,
    r2_key TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_customer ON public.kyc_documents(customer_id);

CREATE TABLE IF NOT EXISTS public.kyc_reviews (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    kyc_document_id VARCHAR(255) REFERENCES public.kyc_documents(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    reviewer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kyc_reviews_customer ON public.kyc_reviews(customer_id);

CREATE TABLE IF NOT EXISTS public.media_assets (
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
CREATE INDEX IF NOT EXISTS idx_media_assets_key ON public.media_assets(object_key);
CREATE INDEX IF NOT EXISTS idx_media_assets_source ON public.media_assets(source_table, source_id);

-- Enable RLS on new tables
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancellation_requests_user_access" ON public.cancellation_requests;
CREATE POLICY "cancellation_requests_user_access" ON public.cancellation_requests
    FOR SELECT USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "refunds_user_access" ON public.refunds;
CREATE POLICY "refunds_user_access" ON public.refunds
    FOR SELECT USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "kyc_documents_user_access" ON public.kyc_documents;
CREATE POLICY "kyc_documents_user_access" ON public.kyc_documents
    FOR SELECT USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "kyc_reviews_user_access" ON public.kyc_reviews;
CREATE POLICY "kyc_reviews_user_access" ON public.kyc_reviews
    FOR SELECT USING (customer_id = auth.uid() OR public.is_admin_or_manager());

DROP POLICY IF EXISTS "media_assets_read_access" ON public.media_assets;
CREATE POLICY "media_assets_read_access" ON public.media_assets
    FOR SELECT USING (true);

-- ==============================================================================
-- 2. SECURE SUPABASE RPC FUNCTIONS
-- ==============================================================================

-- 2.1 ghn_validate_coupon
CREATE OR REPLACE FUNCTION public.ghn_validate_coupon(
    p_code TEXT,
    p_customer_id UUID DEFAULT NULL,
    p_order_amount NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
    v_discount NUMERIC := 0;
    v_customer_usages INTEGER := 0;
BEGIN
    SELECT * INTO v_coupon FROM public.coupons 
    WHERE UPPER(code) = UPPER(TRIM(p_code)) AND (active = true OR is_active = true)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Invalid or inactive coupon code');
    END IF;

    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > NOW() THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Coupon is not yet active');
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Coupon has expired');
    END IF;

    IF v_coupon.used_count >= COALESCE(v_coupon.usage_limit, 999999999) THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Coupon usage limit has been reached');
    END IF;

    IF p_order_amount > 0 AND p_order_amount < COALESCE(v_coupon.minimum_order_amount, v_coupon.min_order_amount, 0) THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Order amount does not meet minimum requirement of NPR ' || COALESCE(v_coupon.minimum_order_amount, v_coupon.min_order_amount, 0));
    END IF;

    IF p_customer_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_customer_usages FROM public.coupon_usages 
        WHERE (coupon_id = v_coupon.id OR UPPER(coupon_id) = UPPER(v_coupon.code)) AND customer_id = p_customer_id;
        
        IF v_customer_usages >= COALESCE(v_coupon.usage_per_customer, 999999999) THEN
            RETURN jsonb_build_object('valid', false, 'message', 'You have already reached the maximum usage for this coupon');
        END IF;
    END IF;

    IF LOWER(COALESCE(v_coupon.discount_type, 'percentage')) = 'percentage' THEN
        v_discount := ROUND((p_order_amount * COALESCE(v_coupon.discount_value, v_coupon.discount_percentage, 10)) / 100, 2);
    ELSE
        v_discount := COALESCE(v_coupon.discount_value, 0);
    END IF;

    IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
        v_discount := v_coupon.max_discount_amount;
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'couponId', v_coupon.id,
        'code', v_coupon.code,
        'discount', v_discount,
        'discountType', v_coupon.discount_type,
        'discountValue', v_coupon.discount_value,
        'minOrderAmount', COALESCE(v_coupon.minimum_order_amount, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 ghn_adjust_wallet
CREATE OR REPLACE FUNCTION public.ghn_adjust_wallet(
    p_customer_id UUID,
    p_amount NUMERIC,
    p_type TEXT,
    p_reference TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_order_id TEXT DEFAULT NULL,
    p_admin_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
    v_tx_id TEXT;
    v_adj_amount NUMERIC := ABS(p_amount);
BEGIN
    SELECT * INTO v_wallet FROM public.wallets WHERE customer_id = p_customer_id FOR UPDATE;
    
    IF NOT FOUND THEN
        INSERT INTO public.wallets (id, customer_id, balance, currency, status)
        VALUES (gen_random_uuid(), p_customer_id, 0.00, 'NPR', 'ACTIVE')
        RETURNING * INTO v_wallet;
    END IF;

    IF v_wallet.status != 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet is inactive or suspended');
    END IF;

    v_balance_before := v_wallet.balance;

    IF UPPER(p_type) IN ('DEBIT', 'PURCHASE', 'WITHDRAWAL') THEN
        IF v_balance_before < v_adj_amount THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Insufficient wallet balance. Available: NPR ' || v_balance_before || ', Required: NPR ' || v_adj_amount
            );
        END IF;
        v_balance_after := v_balance_before - v_adj_amount;
    ELSE
        v_balance_after := v_balance_before + v_adj_amount;
    END IF;

    UPDATE public.wallets 
    SET balance = v_balance_after, updated_at = NOW() 
    WHERE id = v_wallet.id;

    v_tx_id := 'wtx_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.wallet_transactions (
        id, wallet_id, customer_id, type, amount, balance_before, balance_after,
        status, payment_method, reference, description, order_id, admin_verified, admin_verified_by, created_at, updated_at
    ) VALUES (
        v_tx_id, v_wallet.id, p_customer_id, UPPER(p_type), v_adj_amount, v_balance_before, v_balance_after,
        'COMPLETED', 'WALLET', p_reference, p_description, p_order_id, (p_admin_id IS NOT NULL), p_admin_id, NOW(), NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'transactionId', v_tx_id,
        'walletId', v_wallet.id,
        'balanceBefore', v_balance_before,
        'balanceAfter', v_balance_after,
        'amount', v_adj_amount,
        'type', UPPER(p_type)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 ghn_submit_wallet_deposit
CREATE OR REPLACE FUNCTION public.ghn_submit_wallet_deposit(
    p_customer_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference TEXT,
    p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_tx_id TEXT;
    v_dep_amount NUMERIC := ABS(p_amount);
BEGIN
    IF v_dep_amount < 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimum deposit amount is NPR 10');
    END IF;

    SELECT * INTO v_wallet FROM public.wallets WHERE customer_id = p_customer_id;
    IF NOT FOUND THEN
        INSERT INTO public.wallets (id, customer_id, balance, currency, status)
        VALUES (gen_random_uuid(), p_customer_id, 0.00, 'NPR', 'ACTIVE')
        RETURNING * INTO v_wallet;
    END IF;

    v_tx_id := 'wtx_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.wallet_transactions (
        id, wallet_id, customer_id, type, amount, balance_before, balance_after,
        status, payment_method, reference, description, admin_verified, created_at, updated_at
    ) VALUES (
        v_tx_id, v_wallet.id, p_customer_id, 'DEPOSIT', v_dep_amount, v_wallet.balance, v_wallet.balance,
        'PENDING', UPPER(p_payment_method), TRIM(p_reference),
        'Wallet top-up via ' || p_payment_method || ' (Ref: ' || p_reference || ')',
        false, NOW(), NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'transactionId', v_tx_id,
        'walletId', v_wallet.id,
        'amount', v_dep_amount,
        'status', 'PENDING'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 ghn_review_wallet_deposit
CREATE OR REPLACE FUNCTION public.ghn_review_wallet_deposit(
    p_transaction_id TEXT,
    p_action TEXT,
    p_admin_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tx RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_tx FROM public.wallet_transactions WHERE id = p_transaction_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Deposit transaction not found');
    END IF;

    IF v_tx.status != 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transaction has already been ' || LOWER(v_tx.status));
    END IF;

    SELECT * INTO v_wallet FROM public.wallets WHERE id = v_tx.wallet_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Associated wallet not found');
    END IF;

    IF LOWER(p_action) = 'approve' THEN
        v_new_balance := v_wallet.balance + v_tx.amount;
        
        UPDATE public.wallets 
        SET balance = v_new_balance, updated_at = NOW() 
        WHERE id = v_wallet.id;

        UPDATE public.wallet_transactions
        SET status = 'COMPLETED',
            balance_before = v_wallet.balance,
            balance_after = v_new_balance,
            admin_verified = true,
            admin_verified_by = p_admin_id,
            admin_notes = COALESCE(p_notes, 'Approved by Admin'),
            updated_at = NOW()
        WHERE id = v_tx.id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'APPROVED',
            'transactionId', v_tx.id,
            'newBalance', v_new_balance
        );
    ELSE
        UPDATE public.wallet_transactions
        SET status = 'REJECTED',
            admin_verified = true,
            admin_verified_by = p_admin_id,
            admin_notes = COALESCE(p_notes, 'Rejected by Admin'),
            updated_at = NOW()
        WHERE id = v_tx.id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'REJECTED',
            'transactionId', v_tx.id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.5 ghn_update_inventory
CREATE OR REPLACE FUNCTION public.ghn_update_inventory(
    p_package_id TEXT,
    p_quantity INTEGER DEFAULT 1,
    p_action TEXT DEFAULT 'DEDUCT'
)
RETURNS JSONB AS $$
DECLARE
    v_pkg RECORD;
BEGIN
    SELECT * INTO v_pkg FROM public.product_packages WHERE id = p_package_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Package not found');
    END IF;

    IF NOT v_pkg.active THEN
        RETURN jsonb_build_object('success', false, 'message', 'Package is inactive');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'packageId', p_package_id,
        'action', UPPER(p_action),
        'quantity', p_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.6 ghn_create_order / ghn_place_order
CREATE OR REPLACE FUNCTION public.ghn_create_order(
    p_order_id TEXT,
    p_order_code TEXT,
    p_customer_id UUID,
    p_product_id TEXT,
    p_package_id TEXT,
    p_game_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_mobile TEXT,
    p_game_uid TEXT,
    p_game_server TEXT,
    p_game_username TEXT,
    p_region TEXT,
    p_quantity INTEGER,
    p_coupon_code TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'eSewa / Khalti QR',
    p_transaction_id TEXT DEFAULT NULL,
    p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_pkg RECORD;
    v_unit_price NUMERIC := 0;
    v_coupon_res JSONB;
    v_coupon_discount NUMERIC := 0;
    v_coupon_id TEXT := NULL;
    v_coupon_code_snap TEXT := NULL;
    v_total_amount NUMERIC := 0;
    v_is_wallet_pay BOOLEAN := false;
    v_payment_id TEXT;
    v_payment_status TEXT := 'pending_verification';
    v_order_status TEXT := 'pending_payment';
    v_wallet_res JSONB;
    v_qty INTEGER := GREATEST(1, COALESCE(p_quantity, 1));
BEGIN
    IF p_package_id IS NOT NULL AND p_package_id != '' THEN
        SELECT * INTO v_pkg FROM public.product_packages WHERE id = p_package_id;
        IF NOT FOUND OR v_pkg.active = false THEN
            RETURN jsonb_build_object('success', false, 'message', 'Selected product package is invalid or inactive');
        END IF;
        v_unit_price := v_pkg.price;
    END IF;

    IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) != '' THEN
        v_coupon_res := public.ghn_validate_coupon(p_coupon_code, p_customer_id, v_unit_price * v_qty);
        IF (v_coupon_res->>'valid')::boolean = true THEN
            v_coupon_discount := (v_coupon_res->>'discount')::numeric;
            v_coupon_id := v_coupon_res->>'couponId';
            v_coupon_code_snap := v_coupon_res->>'code';
        END IF;
    END IF;

    v_total_amount := GREATEST(0, (v_unit_price * v_qty) - v_coupon_discount);
    v_payment_id := 'pay_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    IF LOWER(p_payment_method) IN ('wallet', 'gamer_wallet', 'gamer wallet') THEN
        v_is_wallet_pay := true;
        v_wallet_res := public.ghn_adjust_wallet(
            p_customer_id,
            v_total_amount,
            'PURCHASE',
            'ORDER-' || p_order_code,
            'Payment for Order #' || p_order_code,
            p_order_id,
            NULL
        );
        IF (v_wallet_res->>'success')::boolean != true THEN
            RETURN jsonb_build_object('success', false, 'message', v_wallet_res->>'message');
        END IF;
        v_payment_status := 'verified';
        v_order_status := 'processing';
    END IF;

    INSERT INTO public.orders (
        id, order_code, order_number, customer_id, product_id, package_id, game_id,
        customer_name_snapshot, customer_email_snapshot, customer_mobile_snapshot,
        game_uid, game_server, game_username, region, quantity, unit_price, total_amount,
        payment_id, payment_status, order_status, coupon_id, coupon_code_snapshot, coupon_discount,
        created_at, updated_at
    ) VALUES (
        p_order_id, p_order_code, p_order_code, p_customer_id, p_product_id, p_package_id, p_game_id,
        p_customer_name, p_customer_email, p_customer_mobile,
        p_game_uid, p_game_server, p_game_username, p_region, v_qty, v_unit_price, v_total_amount,
        v_payment_id, v_payment_status, v_order_status, v_coupon_id, v_coupon_code_snap, v_coupon_discount,
        NOW(), NOW()
    );

    INSERT INTO public.payments (
        id, order_id, customer_id, method, amount, currency, transaction_id, payment_status,
        proof_url, verified_at, verified_by, submitted_at, created_at, updated_at
    ) VALUES (
        v_payment_id, p_order_id, p_customer_id, p_payment_method, v_total_amount, 'NPR',
        p_transaction_id, v_payment_status, p_proof_url,
        CASE WHEN v_is_wallet_pay THEN NOW() ELSE NULL END,
        CASE WHEN v_is_wallet_pay THEN 'SYSTEM_WALLET' ELSE NULL END,
        NOW(), NOW(), NOW()
    );

    INSERT INTO public.order_status_history (
        id, order_id, old_status, new_status, changed_by, note, created_at
    ) VALUES (
        'osh_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6),
        p_order_id, NULL, v_order_status,
        CASE WHEN v_is_wallet_pay THEN 'System (Wallet)' ELSE COALESCE(p_customer_name, 'Customer') END,
        CASE WHEN v_is_wallet_pay THEN 'Paid instantly using Gamer Wallet' ELSE 'Order placed. Pending verification.' END,
        NOW()
    );

    IF v_coupon_id IS NOT NULL THEN
        INSERT INTO public.coupon_usages (
            id, coupon_id, customer_id, order_id, discount_amount, used_at
        ) VALUES (
            'use_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6),
            v_coupon_id, p_customer_id, p_order_id, v_coupon_discount, NOW()
        );
        UPDATE public.coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = v_coupon_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'orderId', p_order_id,
        'orderCode', p_order_code,
        'totalAmount', v_total_amount,
        'paymentStatus', v_payment_status,
        'orderStatus', v_order_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alias for ghn_place_order
CREATE OR REPLACE FUNCTION public.ghn_place_order(
    p_order_id TEXT,
    p_order_code TEXT,
    p_customer_id UUID,
    p_product_id TEXT,
    p_package_id TEXT,
    p_game_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_mobile TEXT,
    p_game_uid TEXT,
    p_game_server TEXT,
    p_game_username TEXT,
    p_region TEXT,
    p_quantity INTEGER,
    p_coupon_code TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'eSewa / Khalti QR',
    p_transaction_id TEXT DEFAULT NULL,
    p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.ghn_create_order(
        p_order_id, p_order_code, p_customer_id, p_product_id, p_package_id, p_game_id,
        p_customer_name, p_customer_email, p_customer_mobile, p_game_uid, p_game_server,
        p_game_username, p_region, p_quantity, p_coupon_code, p_payment_method,
        p_transaction_id, p_proof_url
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.7 ghn_submit_payment
CREATE OR REPLACE FUNCTION public.ghn_submit_payment(
    p_order_id TEXT,
    p_customer_id UUID,
    p_method TEXT,
    p_amount NUMERIC,
    p_transaction_id TEXT,
    p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_pay_id TEXT;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id OR order_code = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    v_pay_id := 'pay_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.payments (
        id, order_id, customer_id, method, amount, currency, transaction_id,
        payment_status, proof_url, submitted_at, created_at, updated_at
    ) VALUES (
        v_pay_id, v_order.id, p_customer_id, p_method, COALESCE(p_amount, v_order.total_amount), 'NPR',
        p_transaction_id, 'pending_verification', p_proof_url, NOW(), NOW(), NOW()
    );

    UPDATE public.orders 
    SET payment_status = 'pending_verification', payment_id = v_pay_id, updated_at = NOW() 
    WHERE id = v_order.id;

    RETURN jsonb_build_object('success', true, 'paymentId', v_pay_id, 'orderId', v_order.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.8 ghn_verify_payment
CREATE OR REPLACE FUNCTION public.ghn_verify_payment(
    p_payment_id TEXT,
    p_order_id TEXT,
    p_action TEXT,
    p_admin_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_target_status TEXT;
BEGIN
    IF LOWER(p_action) = 'approve' THEN
        v_target_status := 'verified';
        UPDATE public.payments 
        SET payment_status = 'verified', verified_at = NOW(), verified_by = p_admin_id, updated_at = NOW()
        WHERE id = p_payment_id OR order_id = p_order_id;

        UPDATE public.orders 
        SET payment_status = 'verified', order_status = 'processing', updated_at = NOW()
        WHERE id = p_order_id OR payment_id = p_payment_id;

        INSERT INTO public.order_status_history (id, order_id, old_status, new_status, changed_by, note, created_at)
        VALUES ('osh_' || floor(extract(epoch from now()) * 1000)::text, p_order_id, 'pending_payment', 'processing', p_admin_id, COALESCE(p_notes, 'Payment verified by Admin'), NOW());
    ELSE
        v_target_status := 'rejected';
        UPDATE public.payments 
        SET payment_status = 'rejected', rejected_at = NOW(), rejected_by = p_admin_id, updated_at = NOW()
        WHERE id = p_payment_id OR order_id = p_order_id;

        UPDATE public.orders 
        SET payment_status = 'rejected', order_status = 'rejected', rejection_reason = p_notes, updated_at = NOW()
        WHERE id = p_order_id OR payment_id = p_payment_id;

        INSERT INTO public.order_status_history (id, order_id, old_status, new_status, changed_by, note, created_at)
        VALUES ('osh_' || floor(extract(epoch from now()) * 1000)::text, p_order_id, 'pending_payment', 'rejected', p_admin_id, COALESCE(p_notes, 'Payment rejected by Admin'), NOW());
    END IF;

    RETURN jsonb_build_object('success', true, 'status', v_target_status, 'orderId', p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.9 ghn_update_order_status
CREATE OR REPLACE FUNCTION public.ghn_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
    p_changed_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id OR order_code = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    UPDATE public.orders 
    SET order_status = p_new_status, admin_notes = COALESCE(p_notes, admin_notes), updated_at = NOW()
    WHERE id = v_order.id;

    INSERT INTO public.order_status_history (id, order_id, old_status, new_status, changed_by, note, created_at)
    VALUES (
        'osh_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6),
        v_order.id, v_order.order_status, p_new_status, p_changed_by, p_notes, NOW()
    );

    RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'oldStatus', v_order.order_status, 'newStatus', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.10 ghn_request_cancellation
CREATE OR REPLACE FUNCTION public.ghn_request_cancellation(
    p_order_id TEXT,
    p_customer_id UUID,
    p_reason TEXT,
    p_refund_method TEXT DEFAULT 'WALLET',
    p_refund_details TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_canc_id TEXT;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id OR order_code = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    IF v_order.order_status IN ('cancelled', 'completed', 'delivered') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel order in ' || v_order.order_status || ' status');
    END IF;

    v_canc_id := 'canc_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.cancellation_requests (
        id, order_id, customer_id, reason, status, refund_method, refund_details, requested_at
    ) VALUES (
        v_canc_id, v_order.id, p_customer_id, p_reason, 'PENDING', p_refund_method, p_refund_details, NOW()
    );

    UPDATE public.orders SET order_status = 'cancellation_requested', updated_at = NOW() WHERE id = v_order.id;

    RETURN jsonb_build_object('success', true, 'cancellationId', v_canc_id, 'orderId', v_order.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.11 ghn_resolve_cancellation
CREATE OR REPLACE FUNCTION public.ghn_resolve_cancellation(
    p_cancellation_id TEXT,
    p_action TEXT,
    p_admin_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_canc RECORD;
BEGIN
    SELECT * INTO v_canc FROM public.cancellation_requests WHERE id = p_cancellation_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cancellation request not found');
    END IF;

    IF LOWER(p_action) = 'approve' THEN
        UPDATE public.cancellation_requests 
        SET status = 'APPROVED', admin_notes = p_notes, resolved_by = p_admin_id, resolved_at = NOW()
        WHERE id = v_canc.id;

        UPDATE public.orders SET order_status = 'cancelled', updated_at = NOW() WHERE id = v_canc.order_id;
    ELSE
        UPDATE public.cancellation_requests 
        SET status = 'REJECTED', admin_notes = p_notes, resolved_by = p_admin_id, resolved_at = NOW()
        WHERE id = v_canc.id;
    END IF;

    RETURN jsonb_build_object('success', true, 'cancellationId', v_canc.id, 'action', UPPER(p_action));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.12 ghn_process_refund
CREATE OR REPLACE FUNCTION public.ghn_process_refund(
    p_order_id TEXT,
    p_customer_id UUID,
    p_amount NUMERIC,
    p_reason TEXT,
    p_processed_by TEXT,
    p_method TEXT DEFAULT 'WALLET'
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_ref_id TEXT;
    v_wallet_res JSONB;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id OR order_code = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    v_ref_id := 'ref_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    IF UPPER(p_method) = 'WALLET' THEN
        v_wallet_res := public.ghn_adjust_wallet(
            p_customer_id,
            p_amount,
            'CREDIT',
            'REFUND-' || v_order.order_code,
            'Refund for Order #' || v_order.order_code || ': ' || p_reason,
            v_order.id,
            p_processed_by
        );
        IF (v_wallet_res->>'success')::boolean != true THEN
            RETURN jsonb_build_object('success', false, 'message', 'Wallet refund failed: ' || (v_wallet_res->>'message'));
        END IF;
    END IF;

    INSERT INTO public.refunds (
        id, order_id, customer_id, amount, currency, refund_method, status, reason, processed_by, created_at, updated_at
    ) VALUES (
        v_ref_id, v_order.id, p_customer_id, p_amount, 'NPR', UPPER(p_method), 'COMPLETED', p_reason, p_processed_by, NOW(), NOW()
    );

    UPDATE public.orders SET order_status = 'refunded', updated_at = NOW() WHERE id = v_order.id;

    RETURN jsonb_build_object('success', true, 'refundId', v_ref_id, 'amount', p_amount, 'method', UPPER(p_method));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.13 ghn_submit_kyc
CREATE OR REPLACE FUNCTION public.ghn_submit_kyc(
    p_customer_id UUID,
    p_doc_type TEXT,
    p_doc_number TEXT,
    p_document_url TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_doc_id TEXT;
BEGIN
    v_doc_id := 'kyc_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.kyc_documents (
        id, customer_id, doc_type, doc_number, document_url, notes, status, created_at, updated_at
    ) VALUES (
        v_doc_id, p_customer_id, p_doc_type, p_doc_number, p_document_url, p_notes, 'PENDING', NOW(), NOW()
    );

    UPDATE public.customers 
    SET verification_status = 'pending',
        verification_doc_type = p_doc_type,
        verification_doc_number = p_doc_number,
        verification_submitted_at = NOW(),
        verification_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN jsonb_build_object('success', true, 'documentId', v_doc_id, 'status', 'PENDING');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.14 ghn_review_kyc
CREATE OR REPLACE FUNCTION public.ghn_review_kyc(
    p_customer_id UUID,
    p_action TEXT,
    p_reviewed_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_is_approved BOOLEAN := (LOWER(p_action) = 'approve');
    v_rev_id TEXT;
BEGIN
    v_rev_id := 'kycrev_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.kyc_reviews (
        id, customer_id, action, reviewer_id, notes, created_at
    ) VALUES (
        v_rev_id, p_customer_id, UPPER(p_action), p_reviewed_by, p_notes, NOW()
    );

    IF v_is_approved THEN
        UPDATE public.customers 
        SET verification_status = 'verified',
            account_verified = true,
            verified_at = NOW(),
            verified_by = p_reviewed_by,
            updated_at = NOW()
        WHERE id = p_customer_id;

        UPDATE public.kyc_documents 
        SET status = 'APPROVED', updated_at = NOW() 
        WHERE customer_id = p_customer_id AND status = 'PENDING';
    ELSE
        UPDATE public.customers 
        SET verification_status = 'rejected',
            rejection_reason = p_notes,
            updated_at = NOW()
        WHERE id = p_customer_id;

        UPDATE public.kyc_documents 
        SET status = 'REJECTED', updated_at = NOW() 
        WHERE customer_id = p_customer_id AND status = 'PENDING';
    END IF;

    RETURN jsonb_build_object('success', true, 'action', UPPER(p_action), 'customerId', p_customer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.15 ghn_create_support_ticket
CREATE OR REPLACE FUNCTION public.ghn_create_support_ticket(
    p_customer_id UUID,
    p_order_id TEXT,
    p_subject TEXT,
    p_category TEXT,
    p_priority TEXT,
    p_initial_message TEXT,
    p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_ticket_id TEXT;
    v_ticket_num TEXT;
BEGIN
    v_ticket_id := 'tkt_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);
    v_ticket_num := 'GHN-TKT-' || floor(100000 + random() * 900000)::text;

    INSERT INTO public.support_tickets (
        id, ticket_number, customer_id, order_id, subject, category, priority, status, created_at, updated_at
    ) VALUES (
        v_ticket_id, v_ticket_num, p_customer_id, p_order_id, p_subject, COALESCE(p_category, 'General'), COALESCE(p_priority, 'MEDIUM'), 'OPEN', NOW(), NOW()
    );

    IF p_initial_message IS NOT NULL AND TRIM(p_initial_message) != '' THEN
        INSERT INTO public.support_messages (
            id, ticket_id, sender_type, sender_id, sender_name, message, attachments, created_at
        ) VALUES (
            'msg_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6),
            v_ticket_id, 'CUSTOMER', p_customer_id::text, 'Customer', p_initial_message, COALESCE(p_attachments, '[]'::jsonb), NOW()
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'ticketId', v_ticket_id, 'ticketNumber', v_ticket_num);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.16 ghn_add_support_message
CREATE OR REPLACE FUNCTION public.ghn_add_support_message(
    p_ticket_id TEXT,
    p_sender_type TEXT,
    p_sender_id TEXT,
    p_sender_name TEXT,
    p_message TEXT,
    p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_msg_id TEXT;
BEGIN
    v_msg_id := 'msg_' || floor(extract(epoch from now()) * 1000)::text || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.support_messages (
        id, ticket_id, sender_type, sender_id, sender_name, message, attachments, created_at
    ) VALUES (
        v_msg_id, p_ticket_id, UPPER(p_sender_type), p_sender_id, p_sender_name, p_message, COALESCE(p_attachments, '[]'::jsonb), NOW()
    );

    UPDATE public.support_tickets SET updated_at = NOW() WHERE id = p_ticket_id;

    RETURN jsonb_build_object('success', true, 'messageId', v_msg_id, 'ticketId', p_ticket_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
