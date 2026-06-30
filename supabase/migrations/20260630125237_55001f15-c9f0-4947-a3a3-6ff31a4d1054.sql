CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_buyer uuid := auth.uid(); v_order public.orders%ROWTYPE; v_points int;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> v_buyer THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('delivered','paid') THEN RAISE EXCEPTION 'Order cannot be confirmed'; END IF;

  INSERT INTO public.platform_ledger (entry_type, amount, order_id, user_id, notes)
  VALUES ('commission_sale', v_order.commission_amount, v_order.id, v_order.seller_id, 'buyer confirmed');
  UPDATE public.orders SET status='completed',
    funds_release_at = now() + interval '48 hours',
    funds_released_at = NULL,
    updated_at=now() WHERE id = p_order_id;

  IF v_order.conversation_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
    VALUES (v_order.conversation_id, v_order.buyer_id,
      '✅ Alıcı sifarişi təsdiqlədi. Vəsait 48 saat sonra satıcının balansına köçürüləcək.', 'system');
  END IF;

  v_points := FLOOR(v_order.total)::int;
  IF v_points > 0 THEN
    UPDATE public.profiles SET loyalty_points = loyalty_points + v_points WHERE id = v_order.buyer_id;
    INSERT INTO public.loyalty_ledger (user_id, delta, reason, order_id)
    VALUES (v_order.buyer_id, v_points, 'order_confirmed', v_order.id);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_review(p_product_id uuid, p_rating int, p_comment text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_has boolean;
  v_seller uuid;
  v_conv uuid;
  v_stars text;
  v_comment_clean text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Reytinq 1-5 arası olmalıdır'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.orders
    WHERE buyer_id = v_uid AND product_id = p_product_id AND status = 'completed'
  ) INTO v_has;
  IF NOT v_has THEN
    RAISE EXCEPTION 'Yalnız tamamlanmış sifarişiniz olan məhsula rəy yaza bilərsiniz';
  END IF;

  v_comment_clean := NULLIF(trim(coalesce(p_comment,'')), '');

  INSERT INTO public.reviews (product_id, reviewer_id, rating, comment)
  VALUES (p_product_id, v_uid, p_rating, v_comment_clean)
  ON CONFLICT (product_id, reviewer_id)
  DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = now()
  RETURNING id INTO v_id;

  SELECT seller_id INTO v_seller FROM public.products WHERE id = p_product_id;
  IF v_seller IS NOT NULL THEN
    SELECT conversation_id INTO v_conv
    FROM public.orders
    WHERE buyer_id = v_uid AND product_id = p_product_id AND conversation_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 1;

    IF v_conv IS NULL THEN
      SELECT id INTO v_conv FROM public.conversations
      WHERE product_id = p_product_id
        AND ((user_a = v_uid AND user_b = v_seller) OR (user_a = v_seller AND user_b = v_uid))
      ORDER BY created_at DESC LIMIT 1;
    END IF;

    IF v_conv IS NOT NULL THEN
      v_stars := repeat('⭐', p_rating);
      INSERT INTO public.dm_messages (conversation_id, sender_id, body, kind)
      VALUES (v_conv, v_uid,
        '📝 Alıcı rəy yazdı: ' || v_stars || ' (' || p_rating::text || '/5)' ||
        CASE WHEN v_comment_clean IS NOT NULL THEN E'\n«' || v_comment_clean || '»' ELSE '' END,
        'system');
    END IF;
  END IF;

  RETURN v_id;
END $$;