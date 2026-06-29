
CREATE OR REPLACE FUNCTION public.submit_review(p_product_id uuid, p_rating int, p_comment text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_has boolean;
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
  INSERT INTO public.reviews (product_id, reviewer_id, rating, comment)
  VALUES (p_product_id, v_uid, p_rating, NULLIF(trim(coalesce(p_comment,'')),''))
  ON CONFLICT (product_id, reviewer_id)
  DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
