
-- 1. Lock down profiles UPDATE: column-level grants + WITH CHECK
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, display_name, avatar_url, last_seen_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Lock down orders UPDATE: column-level grants + WITH CHECK
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (buyer_notes, dispute_evidence_url) ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Order parties update" ON public.orders;
CREATE POLICY "Order parties update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support')
  )
  WITH CHECK (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support')
  );

-- 3. Allow users to delete their own topup receipt files
DROP POLICY IF EXISTS "Users delete own topup receipts" ON storage.objects;
CREATE POLICY "Users delete own topup receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'topup-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
