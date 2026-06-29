
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS attachment_url text;

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.dm_messages'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%kind%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.dm_messages DROP CONSTRAINT %I', c); END IF;
END $$;
ALTER TABLE public.dm_messages ADD CONSTRAINT dm_messages_kind_check CHECK (kind IN ('user','system','staff'));

CREATE POLICY "chat-attachments auth read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat-attachments own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-attachments own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Support reads disputed conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin'))
    AND order_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = conversations.order_id AND o.status = 'disputed')
  );

CREATE POLICY "Support reads disputed dm_messages"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.conversations c JOIN public.orders o ON o.id = c.order_id
      WHERE c.id = dm_messages.conversation_id AND o.status = 'disputed'
    )
  );

CREATE POLICY "Support inserts staff messages on disputed"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'staff'
    AND sender_id = auth.uid()
    AND (public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.conversations c JOIN public.orders o ON o.id = c.order_id
      WHERE c.id = conversation_id AND o.status = 'disputed'
    )
  );

CREATE OR REPLACE FUNCTION public.admin_partial_refund(p_order_id uuid, p_refund_amount numeric, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE;
BEGIN
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid','delivered','disputed') THEN
    RAISE EXCEPTION 'Order cannot be partially refunded in status %', v_order.status;
  END IF;
  IF p_refund_amount <= 0 OR p_refund_amount > v_order.total THEN
    RAISE EXCEPTION 'Invalid refund amount';
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + p_refund_amount WHERE id = v_order.buyer_id;
  IF (v_order.total - p_refund_amount) > 0 THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + (v_order.total - p_refund_amount) WHERE id = v_order.seller_id;
  END IF;

  UPDATE public.orders SET status='completed', auto_confirm_at=NULL, updated_at=now(),
    delivery_payload = COALESCE(delivery_payload,'') ||
      E'\n[partial refund ' || p_refund_amount::text || ' AZN by staff ' || v_uid::text ||
      COALESCE(' — ' || p_notes,'') || ']'
    WHERE id = p_order_id;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      'Admin qismən geri qaytarma qərarı verdi: ' || p_refund_amount::text || ' AZN alıcıya, ' ||
      (v_order.total - p_refund_amount)::text || ' AZN satıcıya köçürüldü.' ||
      COALESCE(E'\nQeyd: ' || p_notes,''), 'system');
  END IF;
END; $$;
