-- Make public_profiles a security-definer-style view (runs with owner privileges)
-- so anonymous visitors can read safe seller fields (name, avatar, tier, etc.)
-- without granting anon SELECT on the full profiles table.
ALTER VIEW public.public_profiles SET (security_invoker = false);
GRANT SELECT ON public.public_profiles TO anon, authenticated;