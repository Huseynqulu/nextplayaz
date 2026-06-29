DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_update_review(p_id uuid, p_rating int, p_comment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Reytinq 1-5 arası olmalıdır';
  END IF;
  UPDATE public.reviews
    SET rating  = COALESCE(p_rating, rating),
        comment = NULLIF(trim(COALESCE(p_comment, comment)), '')
  WHERE id = p_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_review(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  DELETE FROM public.reviews WHERE id = p_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_update_review(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_review(uuid) TO authenticated;