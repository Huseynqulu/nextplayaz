
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, username, display_name, shop_name, avatar_url, created_at, last_seen_at, seller_tier, sales_count, verified_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
