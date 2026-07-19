
-- Revoke anon EXECUTE and PUBLIC EXECUTE from SECURITY DEFINER functions that require an authenticated caller.
-- Keep anon EXECUTE only on genuinely public functions (homepage stats, category counts, recent sales, has_role for RLS).

REVOKE EXECUTE ON FUNCTION public.admin_approve_topup(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_create_gift_cards(numeric, integer, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_deactivate_gift_card(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_banner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_review(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_partial_refund(uuid, numeric, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_record_platform_payout(numeric, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute(uuid, boolean, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_review(uuid, integer, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_banner(uuid, text, text, text, text, text, text, integer, boolean, timestamp with time zone, timestamp with time zone) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_boost_pricing(integer, numeric, text, text, text, integer, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_order_payment(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_referral_code() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.boost_product(uuid, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_support_ticket(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_wallet_balance() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referral_stats() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_user_ip(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_referral_signup(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_order_payment(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seller_effective_commission_rate(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_avg_response_minutes(uuid) FROM anon, PUBLIC;

-- Trigger-only helpers: never called via API. Revoke all non-owner EXECUTE.
REVOKE EXECUTE ON FUNCTION public.bump_conversation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_ticket_on_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_dm() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_review() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_order() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_seller_new_order() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_referral_reward() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_seller_tier(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_seller_funds() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_product_stock_from_items() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_product_last_sold() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_seller_tier() FROM anon, authenticated, PUBLIC;
