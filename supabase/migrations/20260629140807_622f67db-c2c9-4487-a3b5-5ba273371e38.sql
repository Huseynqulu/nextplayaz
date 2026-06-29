
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX idx_favorites_product ON public.favorites(product_id);

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select_fav" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert_fav" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_fav" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.toggle_favorite(p_product_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.favorites WHERE user_id = v_uid AND product_id = p_product_id) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.favorites WHERE user_id = v_uid AND product_id = p_product_id;
    RETURN false;
  ELSE
    INSERT INTO public.favorites (user_id, product_id) VALUES (v_uid, p_product_id);
    RETURN true;
  END IF;
END $$;
