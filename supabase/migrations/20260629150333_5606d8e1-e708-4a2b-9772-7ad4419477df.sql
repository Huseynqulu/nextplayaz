
-- 1) PROFILES: column-level grants so wallet_balance / referral_code / referred_by are private
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, display_name, avatar_url, last_seen_at, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
-- Owner needs full row; provide via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id uuid, username text, display_name text, avatar_url text,
  wallet_balance numeric, referral_code text, referred_by uuid,
  last_seen_at timestamptz, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, display_name, avatar_url,
         wallet_balance, referral_code, referred_by,
         last_seen_at, created_at, updated_at
  FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_wallet_balance()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT wallet_balance FROM public.profiles WHERE id = auth.uid(); $$;
REVOKE EXECUTE ON FUNCTION public.get_my_wallet_balance() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_wallet_balance() TO authenticated;

-- 2) DISCOUNT CODES: drop authenticated SELECT policy (validation happens inside create_order)
DROP POLICY IF EXISTS "Anyone authenticated can read active codes" ON public.discount_codes;

-- 3) CHAT-ATTACHMENTS storage: restrict reads to conversation participants + staff
DROP POLICY IF EXISTS "chat-attachments auth read" ON storage.objects;
CREATE POLICY "chat-attachments participants read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND (
    -- uploader
    (storage.foldername(name))[1] = auth.uid()::text
    -- conversation participant (attachment referenced in a dm message)
    OR EXISTS (
      SELECT 1 FROM public.dm_messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.attachment_url = storage.objects.name
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
    -- staff
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support')
  )
);

-- 4) Fix mutable search_path on helper
CREATE OR REPLACE FUNCTION public._gen_ref_code()
RETURNS text LANGUAGE sql SET search_path = public
AS $$ SELECT upper(substring(md5(random()::text || clock_timestamp()::text), 1, 8)); $$;
