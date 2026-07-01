CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, username, display_name, shop_name, avatar_url, created_at, last_seen_at,
  seller_tier, sales_count, verified_at, suspended_until
FROM public.profiles;
ALTER VIEW public.public_profiles SET (security_invoker = false);
GRANT SELECT ON public.public_profiles TO anon, authenticated;