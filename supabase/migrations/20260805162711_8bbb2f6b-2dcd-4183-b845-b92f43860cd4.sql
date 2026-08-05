-- 1. Fix Security Definer View (ERROR)
-- Drop and recreate public_profiles as a security invoker view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS 
SELECT id,
    username,
    display_name,
    shop_name,
    avatar_url,
    created_at,
    last_seen_at,
    seller_tier,
    sales_count,
    verified_at,
    suspended_until
FROM public.profiles;

-- 2. Bulk Revoke Execute from PUBLIC/anon for all functions in public schema
-- This is a proactive security measure.
DO $$
DECLARE
    func_name text;
BEGIN
    FOR func_name IN 
        SELECT quote_ident(n.nspname) || '.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')'
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || func_name || ' FROM PUBLIC';
        EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || func_name || ' FROM anon';
    END LOOP;
END $$;

-- 3. Grant back EXECUTE to authenticated and service_role for necessary app functions
-- (We already revoked from public above, now we explicitly grant where needed)

-- User functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_product_view(uuid) TO authenticated, service_role, anon; -- Allow anon to record views
GRANT EXECUTE ON FUNCTION public.create_direct_purchase(uuid, integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispute_order(uuid, text, text, text) TO authenticated, service_role;

-- Admin/Staff functions
GRANT EXECUTE ON FUNCTION public.admin_list_sellers() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_commission_rate(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_suspend_seller(uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_seller(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_subcategory(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_category(text, text, text, text, integer, boolean, text) TO authenticated, service_role;

-- Seller functions
GRANT EXECUTE ON FUNCTION public.seller_effective_commission_rate(uuid) TO authenticated, service_role;

-- System/Internal functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_confirm_orders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_referral_reward() TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_product_last_sold() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_seller_new_order() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
