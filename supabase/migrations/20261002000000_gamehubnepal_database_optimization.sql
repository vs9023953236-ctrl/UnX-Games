-- 20261002000000_gamehubnepal_database_optimization.sql
-- Game Hub Nepal Database Optimization & Duplicate Index Cleanup
-- Preserves all primary keys, unique constraints, and foreign keys.

DO $$
BEGIN
    -- 1. Remove redundant manual partial indexes where constraint-backed unique key already covers the column
    DROP INDEX IF EXISTS public.category_slugs_uidx;
    DROP INDEX IF EXISTS public.game_slugs_uidx;
    DROP INDEX IF EXISTS public.product_slugs_uidx;

    -- 2. Clean up redundant duplicate timestamps indexes (preserving the canonical ones)
    DROP INDEX IF EXISTS public.idx_orders_created;
    DROP INDEX IF EXISTS public.idx_wallet_transactions_created;
    DROP INDEX IF EXISTS public.idx_audit_logs_created;
    DROP INDEX IF EXISTS public.activity_logs_created_idx;
    DROP INDEX IF EXISTS public.idx_prod_packages_prod_id;
    DROP INDEX IF EXISTS public.idx_orders_status;
    DROP INDEX IF EXISTS public.idx_support_msgs_ticket;

    -- 3. Ensure canonical high-performance indexes exist
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer_id ON public.wallet_transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON public.wallet_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON public.wallet_transactions(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

    CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
    CREATE INDEX IF NOT EXISTS idx_product_packages_product_id ON public.product_packages(product_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
    CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
END $$;
