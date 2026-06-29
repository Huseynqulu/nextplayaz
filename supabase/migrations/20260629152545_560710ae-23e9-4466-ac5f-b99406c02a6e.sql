
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_name text;

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, username, display_name, shop_name, avatar_url, last_seen_at, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.profiles'::regclass AND polcmd = 'w'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "profiles owner update safe"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND wallet_balance = (SELECT wallet_balance FROM public.profiles WHERE id = auth.uid())
  AND referral_code IS NOT DISTINCT FROM (SELECT referral_code FROM public.profiles WHERE id = auth.uid())
  AND referred_by IS NOT DISTINCT FROM (SELECT referred_by FROM public.profiles WHERE id = auth.uid())
);

DROP FUNCTION IF EXISTS public.get_my_profile();
CREATE FUNCTION public.get_my_profile()
 RETURNS TABLE(id uuid, username text, display_name text, shop_name text, avatar_url text, wallet_balance numeric, referral_code text, referred_by uuid, last_seen_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id, username, display_name, shop_name, avatar_url,
         wallet_balance, referral_code, referred_by,
         last_seen_at, created_at, updated_at
  FROM public.profiles WHERE id = auth.uid();
$function$;
