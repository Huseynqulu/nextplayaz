
-- Lock down profiles so wallet/referral/private fields aren't publicly readable.
-- Approach: drop blanket SELECT policies; add owner + staff full read; expose
-- a public.public_profiles view with only safe columns for everyone else.

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;

-- Owner can read full row
CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Staff (admin/support) can read full row
CREATE POLICY "profiles staff read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));

-- Re-grant safe column reads to anon/authenticated only on non-sensitive columns
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, last_seen_at, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Public-safe view used by the frontend for displaying other users
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, username, display_name, avatar_url, last_seen_at, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add an additional permissive SELECT policy that allows reading only when the
-- query targets the safe column set. (RLS is row-level; column protection comes
-- from the GRANT above. This policy makes safe-column reads succeed.)
CREATE POLICY "profiles safe public read" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Note: Combined with column-level GRANTs, anon/authenticated can only read
-- the whitelisted public columns. wallet_balance, referral_code, referred_by
-- require either being the owner (self policy + full grants via service_role
-- helper RPC get_my_profile) or staff.

-- Fix mutable search_path warning on helper
CREATE OR REPLACE FUNCTION public._gen_ref_code()
RETURNS text
LANGUAGE sql
SET search_path = public
AS $$ SELECT upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8)); $$;
