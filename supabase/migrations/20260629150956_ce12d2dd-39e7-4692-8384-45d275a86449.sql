
-- Stop broadcasting profile changes (incl. wallet_balance) over Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;

-- Remove the permissive public SELECT policy. Public access goes through
-- the public_profiles view which exposes only safe columns.
DROP POLICY IF EXISTS "profiles safe public read" ON public.profiles;

-- Tighten grants: no direct SELECT on the table for anon/authenticated.
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- Owner + staff SELECT policies remain in place from the previous migration.
