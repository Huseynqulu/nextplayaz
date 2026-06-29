
-- 1) ORDERS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_confirm_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_reason text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

-- 2) DM messages kind
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'user';

-- 3) Conversations: order link
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS order_id uuid;

-- 4) Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 5) create_order with conversation + system msg + 24h auto-confirm
CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity integer DEFAULT 1, p_discount_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_total numeric;
  v_balance numeric;
  v_order_id uuid;
  v_code public.discount_codes%ROWTYPE;
  v_a uuid; v_b uuid; v_conv uuid;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF v_product.seller_id = v_buyer THEN RAISE EXCEPTION 'You cannot buy your own product'; END IF;
  IF v_product.stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;

  v_total := v_product.price * p_quantity;

  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    SELECT * INTO v_code FROM public.discount_codes
      WHERE upper(code) = upper(trim(p_discount_code)) AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid discount code'; END IF;
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN RAISE EXCEPTION 'Discount code expired'; END IF;
    IF v_code.max_uses IS NOT NULL AND v_code.used_count >= v_code.max_uses THEN RAISE EXCEPTION 'Discount code usage limit reached'; END IF;
    v_total := round(v_total * (100 - v_code.percent) / 100.0, 2);
    UPDATE public.discount_codes SET used_count = used_count + 1 WHERE id = v_code.id;
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  IF v_balance < v_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_buyer;
  UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;

  INSERT INTO public.orders (buyer_id, seller_id, product_id, quantity, unit_price, total, status, auto_confirm_at)
  VALUES (v_buyer, v_product.seller_id, p_product_id, p_quantity, v_product.price, v_total, 'paid', now() + interval '24 hours')
  RETURNING id INTO v_order_id;

  IF v_buyer < v_product.seller_id THEN v_a := v_buyer; v_b := v_product.seller_id;
  ELSE v_a := v_product.seller_id; v_b := v_buyer; END IF;

  INSERT INTO public.conversations (user_a, user_b, product_id, order_id)
  VALUES (v_a, v_b, p_product_id, v_order_id) RETURNING id INTO v_conv;

  UPDATE public.orders SET conversation_id = v_conv WHERE id = v_order_id;

  INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
  VALUES (v_conv, v_product.seller_id,
    '🛒 Yeni sifariş: ' || v_product.title || E'\nMəbləğ: ' || v_total::text || ' ₼' ||
    E'\nSatıcı bu söhbət vasitəsilə məhsulu təhvil verməlidir. Çatdırılmadan sonra alıcı 24 saat ərzində təsdiq etməsə sifariş avtomatik təsdiqlənəcək.',
    'system');

  RETURN v_order_id;
END; $fn$;

-- 6) mark_order_delivered
CREATE OR REPLACE FUNCTION public.mark_order_delivered(p_order_id uuid, p_payload text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_seller uuid := auth.uid(); v_order public.orders%ROWTYPE;
BEGIN
  IF v_seller IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.orders
  SET status='delivered', delivery_payload=p_payload, delivered_at=now(),
      auto_confirm_at = now() + interval '24 hours', updated_at=now()
  WHERE id=p_order_id AND seller_id=v_seller AND status='paid'
  RETURNING * INTO v_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or not deliverable'; END IF;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_seller,
      '📦 Satıcı çatdırılmanı qeyd etdi.' || E'\n24 saat ərzində təsdiq edilməsə sifariş avtomatik tamamlanacaq.',
      'system');
  END IF;
END; $fn$;

-- 7) dispute_order
CREATE OR REPLACE FUNCTION public.dispute_order(p_order_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'Səbəb minimum 5 simvol olmalıdır'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> v_uid THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('paid','delivered') THEN RAISE EXCEPTION 'Bu sifarişə etiraz edilə bilməz'; END IF;
  UPDATE public.orders SET status='disputed', disputed_at=now(), disputed_reason=p_reason,
    auto_confirm_at=NULL, updated_at=now() WHERE id=p_order_id;
  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      '⚠️ Alıcı sifarişə etiraz etdi. Admin baxacaq.' || E'\nSəbəb: ' || p_reason, 'system');
  END IF;
END; $fn$;

-- 8) auto_confirm_orders
CREATE OR REPLACE FUNCTION public.auto_confirm_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_order public.orders%ROWTYPE; v_count int := 0;
BEGIN
  FOR v_order IN
    SELECT * FROM public.orders
    WHERE status IN ('paid','delivered')
      AND auto_confirm_at IS NOT NULL
      AND auto_confirm_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_order.total WHERE id = v_order.seller_id;
    UPDATE public.orders SET status='completed', updated_at=now() WHERE id = v_order.id;
    IF v_order.conversation_id IS NOT NULL THEN
      INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
      VALUES (v_order.conversation_id, v_order.seller_id,
        '✅ Sifariş 24 saat ərzində təsdiq edilmədiyi üçün avtomatik tamamlandı.', 'system');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $fn$;

-- 9) mark_conversation_read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  UPDATE public.dm_messages SET read_at = now()
    WHERE conversation_id = p_conversation_id
      AND sender_id <> v_uid
      AND read_at IS NULL
      AND EXISTS (SELECT 1 FROM public.conversations c
        WHERE c.id = p_conversation_id AND (c.user_a = v_uid OR c.user_b = v_uid));
END; $fn$;

-- 10) admin_resolve_dispute
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_order_id uuid, p_refund boolean, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_uid uuid := auth.uid(); v_order public.orders%ROWTYPE;
BEGIN
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'support')) THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'disputed' THEN RAISE EXCEPTION 'Order is not disputed'; END IF;
  IF p_refund THEN
    UPDATE public.profiles SET wallet_balance=wallet_balance+v_order.total WHERE id=v_order.buyer_id;
    UPDATE public.products SET stock=stock+v_order.quantity WHERE id=v_order.product_id;
    UPDATE public.orders SET status='refunded', updated_at=now() WHERE id=p_order_id;
  ELSE
    UPDATE public.profiles SET wallet_balance=wallet_balance+v_order.total WHERE id=v_order.seller_id;
    UPDATE public.orders SET status='completed', updated_at=now() WHERE id=p_order_id;
  END IF;
  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_uid,
      CASE WHEN p_refund THEN '⚖️ Admin etirazı təsdiqlədi. Alıcıya pul qaytarıldı.'
           ELSE '⚖️ Admin etirazı rədd etdi. Ödəniş satıcıya köçürüldü.' END ||
      COALESCE(E'\nQeyd: ' || p_notes, ''), 'system');
  END IF;
END; $fn$;

-- 11) Avatars storage policies (bucket already exists, private)
DROP POLICY IF EXISTS "Avatars readable by anyone" ON storage.objects;
CREATE POLICY "Avatars readable by anyone" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 12) Cron auto-confirm
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN PERFORM cron.unschedule('auto-confirm-orders'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('auto-confirm-orders', '*/5 * * * *', $$SELECT public.auto_confirm_orders();$$);
