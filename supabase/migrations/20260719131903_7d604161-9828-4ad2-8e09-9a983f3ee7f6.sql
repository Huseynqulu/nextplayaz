-- 1) Make the view respect the caller's RLS, not the creator's
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- 2) Revoke anon execute on privileged/authenticated-only RPCs.
-- These all require auth.uid() or a role check internally; anon has no reason to call them.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'admin_reject_withdrawal','staff_reopen_order','admin_analytics',
        'admin_approve_withdrawal','admin_set_verified','redeem_loyalty_points',
        'redeem_gift_card','dispute_order','admin_delete_subcategory',
        'auto_confirm_orders','admin_set_commission_rate','admin_suspend_seller',
        'admin_unsuspend_seller','submit_review','admin_notify_sellers',
        'confirm_order','admin_revoke_role','get_recommended_products',
        'admin_reject_topup','admin_set_wallet_balance','create_direct_purchase',
        'admin_delete_boost_pricing','admin_grant_role','request_withdrawal',
        'admin_delete_category','toggle_favorite','create_order',
        'touch_last_seen','reply_to_review','admin_upsert_subcategory',
        'mark_order_delivered','admin_list_users','get_seller_stats',
        'admin_list_sellers','record_product_view','get_seller_reviews'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;