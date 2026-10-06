-- 20260922003000_security_hardening_and_password_audit_index.sql
-- Security Hardening & Indexing:
-- 1. Password reset audit index on user_id
-- 2. Revoke execute on internal trigger security definer functions for unprivileged roles

-- Create index on password_reset_audit table if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_audit'
    ) THEN
        CREATE INDEX IF NOT EXISTS password_reset_audit_user_id_idx 
        ON public.password_reset_audit(user_id);
    END IF;
END $$;

-- Revoke execute from public/anon/authenticated on trigger functions
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.handle_new_customer_wallet() FROM anon, authenticated, public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.handle_supabase_auth_user() FROM anon, authenticated, public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
