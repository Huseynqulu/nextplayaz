-- Add seller reply columns
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS seller_reply text,
  ADD COLUMN IF NOT EXISTS seller_replied_at timestamptz;

-- RPC: seller replies to a review on their own product
CREATE OR REPLACE FUNCTION public.reply_to_review(p_review_id uuid, p_reply text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rev public.reviews%ROWTYPE;
  v_seller uuid;
  v_product_title text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_rev FROM public.reviews WHERE id = p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review not found'; END IF;
  SELECT seller_id, title INTO v_seller, v_product_title FROM public.products WHERE id = v_rev.product_id;
  IF v_seller <> v_uid THEN RAISE EXCEPTION 'Only the seller can reply'; END IF;

  IF p_reply IS NULL OR length(trim(p_reply)) = 0 THEN
    UPDATE public.reviews SET seller_reply = NULL, seller_replied_at = NULL WHERE id = p_review_id;
  ELSE
    IF length(trim(p_reply)) > 1000 THEN RAISE EXCEPTION 'Maksimum 1000 simvol'; END IF;
    UPDATE public.reviews
      SET seller_reply = trim(p_reply), seller_replied_at = now()
      WHERE id = p_review_id;

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (v_rev.reviewer_id, 'review',
      '💬 Satıcı rəyinizə cavab verdi',
      COALESCE(v_product_title, 'Məhsul') || ' üzrə cavab yazıldı.',
      '/product/' || v_rev.product_id::text);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_review(uuid, text) TO authenticated;

-- Trigger: notify seller when a new review is created
CREATE OR REPLACE FUNCTION public.notify_on_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_seller uuid; v_title text;
BEGIN
  SELECT seller_id, title INTO v_seller, v_title FROM public.products WHERE id = NEW.product_id;
  IF v_seller IS NOT NULL AND v_seller <> NEW.reviewer_id THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (v_seller, 'review',
      '⭐ Yeni rəy alındı',
      'Məhsulunuza ' || NEW.rating::text || '/5 reytinq verildi' ||
        CASE WHEN NEW.comment IS NOT NULL AND length(NEW.comment) > 0
             THEN ': ' || left(NEW.comment, 80) ELSE '' END,
      '/product/' || NEW.product_id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reviews_notify_seller ON public.reviews;
CREATE TRIGGER reviews_notify_seller
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_review();