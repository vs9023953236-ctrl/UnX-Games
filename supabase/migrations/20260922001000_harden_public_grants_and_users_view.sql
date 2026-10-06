-- 20260922001000_harden_public_grants_and_users_view.sql
-- Security Hardening: Ensure public.users view uses security_invoker=true
-- and lock down direct direct customer table grants for anon/authenticated roles.

-- Ensure secure view definition with security_invoker
CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    id,
    auth_user_id,
    email,
    name,
    role,
    status,
    phone,
    avatar_url,
    created_at,
    updated_at
FROM public.customers;

-- Revoke direct destructive table permissions from public/anon/authenticated roles on backend tables
DO $$
BEGIN
    REVOKE ALL ON TABLE public.customers FROM anon, authenticated;
    REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
    REVOKE ALL ON TABLE public.wallet_transactions FROM anon, authenticated;
    REVOKE ALL ON TABLE public.kyc_verifications FROM anon, authenticated;
    REVOKE ALL ON TABLE public.payments FROM anon, authenticated;
    
    -- Keep authenticated read on safe ghn_sync_events
    GRANT SELECT ON TABLE public.ghn_sync_events TO authenticated;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;
