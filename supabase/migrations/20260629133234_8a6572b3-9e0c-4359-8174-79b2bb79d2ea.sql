CREATE OR REPLACE FUNCTION public.create_order(p_product_id uuid, p_quantity integer DEFAULT 1, p_discount_code text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_total numeric; v_commission numeric; v_seller_net numeric;
  v_balance numeric; v_order_id uuid;
  v_code public.discount_codes%ROWTYPE;
  v_a uuid; v_b uuid; v_conv uuid;
  v_available int; v_delivered_text text := '';
  v_item RECORD; v_is_instant boolean;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF v_product.seller_id = v_buyer THEN RAISE EXCEPTION 'You cannot buy your own product'; END IF;

  v_is_instant := v_product.delivery::text = 'Instant';

  IF v_is_instant THEN
    SELECT count(*) INTO v_available FROM public.product_stock_items
      WHERE product_id = p_product_id AND delivered_at IS NULL;
    IF v_available < p_quantity THEN
      IF v_available = 0 AND v_product.stock >= p_quantity THEN
        v_is_instant := false;
      ELSE
        RAISE EXCEPTION 'Insufficient stock';
      END IF;
    END IF;
  ELSE
    IF v_product.stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  END IF;

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

  v_commission := round(v_total * 0.05, 2);
  v_seller_net := v_total - v_commission;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_buyer FOR UPDATE;
  IF v_balance < v_total THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_total WHERE id = v_buyer;
  IF NOT v_is_instant THEN
    UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  END IF;

  INSERT INTO public.orders (buyer_id, seller_id, product_id, quantity, unit_price, total,
    commission_amount, seller_net, status, auto_confirm_at)
  VALUES (v_buyer, v_product.seller_id, p_product_id, p_quantity, v_product.price, v_total,
    v_commission, v_seller_net,
    CASE WHEN v_is_instant THEN 'delivered'::order_status ELSE 'paid'::order_status END,
    now() + interval '24 hours')
  RETURNING id INTO v_order_id;

  IF v_buyer < v_product.seller_id THEN v_a := v_buyer; v_b := v_product.seller_id;
  ELSE v_a := v_product.seller_id; v_b := v_buyer; END IF;

  -- Reuse existing conversation for this pair+product if present, otherwise create one.
  SELECT id INTO v_conv FROM public.conversations
    WHERE user_a = v_a AND user_b = v_b AND product_id IS NOT DISTINCT FROM p_product_id
    LIMIT 1;
  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b, product_id, order_id)
    VALUES (v_a, v_b, p_product_id, v_order_id) RETURNING id INTO v_conv;
  ELSE
    UPDATE public.conversations SET order_id = COALESCE(order_id, v_order_id) WHERE id = v_conv;
  END IF;
  UPDATE public.orders SET conversation_id = v_conv WHERE id = v_order_id;

  IF v_is_instant THEN
    FOR v_item IN
      SELECT id, content FROM public.product_stock_items
      WHERE product_id = p_product_id AND delivered_at IS NULL
      ORDER BY created_at LIMIT p_quantity FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE public.product_stock_items SET order_id = v_order_id, delivered_at = now() WHERE id = v_item.id;
      v_delivered_text := v_delivered_text || E'\n• ' || v_item.content;
    END LOOP;
    UPDATE public.orders SET delivered_at = now(), delivery_payload = v_delivered_text WHERE id = v_order_id;
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id,
      '✅ Anında çatdırılma — ' || v_product.title ||
      E'\nMəbləğ: ' || v_total::text || ' ₼' ||
      E'\n\n🔑 Məhsul məlumatı:' || v_delivered_text ||
      E'\n\n24 saat ərzində problem olmasa sifariş avtomatik təsdiqlənəcək.', 'system');
  ELSE
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id,
      '🛒 Yeni sifariş: ' || v_product.title || E'\nMəbləğ: ' || v_total::text || ' ₼' ||
      E'\nSatıcı bu söhbət vasitəsilə məhsulu təhvil verməlidir.', 'system');
  END IF;

  IF v_product.auto_message_enabled AND v_product.auto_message IS NOT NULL AND length(trim(v_product.auto_message)) > 0 THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_product.seller_id, v_product.auto_message, 'text');
  END IF;

  RETURN v_order_id;
END; $function$;