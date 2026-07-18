
DROP POLICY IF EXISTS "participants mark read" ON public.dm_messages;
CREATE POLICY "participants mark read" ON public.dm_messages
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = dm_messages.conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())))
WITH CHECK (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = dm_messages.conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid()))
  AND body IS NOT DISTINCT FROM (SELECT m.body FROM dm_messages m WHERE m.id = dm_messages.id)
  AND attachment_url IS NOT DISTINCT FROM (SELECT m.attachment_url FROM dm_messages m WHERE m.id = dm_messages.id)
  AND sender_id IS NOT DISTINCT FROM (SELECT m.sender_id FROM dm_messages m WHERE m.id = dm_messages.id)
  AND kind IS NOT DISTINCT FROM (SELECT m.kind FROM dm_messages m WHERE m.id = dm_messages.id)
  AND conversation_id IS NOT DISTINCT FROM (SELECT m.conversation_id FROM dm_messages m WHERE m.id = dm_messages.id)
);

DROP POLICY IF EXISTS "profiles owner update safe" ON public.profiles;
CREATE POLICY "profiles owner update safe" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND wallet_balance         IS NOT DISTINCT FROM (SELECT p.wallet_balance         FROM profiles p WHERE p.id = auth.uid())
  AND referral_code          IS NOT DISTINCT FROM (SELECT p.referral_code          FROM profiles p WHERE p.id = auth.uid())
  AND referred_by            IS NOT DISTINCT FROM (SELECT p.referred_by            FROM profiles p WHERE p.id = auth.uid())
  AND seller_tier            IS NOT DISTINCT FROM (SELECT p.seller_tier            FROM profiles p WHERE p.id = auth.uid())
  AND verified_at            IS NOT DISTINCT FROM (SELECT p.verified_at            FROM profiles p WHERE p.id = auth.uid())
  AND commission_rate_override IS NOT DISTINCT FROM (SELECT p.commission_rate_override FROM profiles p WHERE p.id = auth.uid())
  AND banned_at              IS NOT DISTINCT FROM (SELECT p.banned_at              FROM profiles p WHERE p.id = auth.uid())
  AND ban_reason             IS NOT DISTINCT FROM (SELECT p.ban_reason             FROM profiles p WHERE p.id = auth.uid())
  AND suspended_until        IS NOT DISTINCT FROM (SELECT p.suspended_until        FROM profiles p WHERE p.id = auth.uid())
  AND suspend_reason         IS NOT DISTINCT FROM (SELECT p.suspend_reason         FROM profiles p WHERE p.id = auth.uid())
  AND sales_count            IS NOT DISTINCT FROM (SELECT p.sales_count            FROM profiles p WHERE p.id = auth.uid())
  AND sales_total            IS NOT DISTINCT FROM (SELECT p.sales_total            FROM profiles p WHERE p.id = auth.uid())
);
