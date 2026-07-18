
-- 1) Product views table
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 1,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_views_user ON public.product_views (user_id, last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON public.product_views (product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own views"
  ON public.product_views
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all views"
  ON public.product_views
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) RPC: record a view (upsert with counter increment)
CREATE OR REPLACE FUNCTION public.record_product_view(_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = _product_id AND is_active = true) THEN RETURN; END IF;

  INSERT INTO public.product_views (user_id, product_id, view_count, last_viewed_at)
  VALUES (_uid, _product_id, 1, now())
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET view_count = public.product_views.view_count + 1, last_viewed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_product_view(UUID) TO authenticated;

-- 3) RPC: personalized recommendations
CREATE OR REPLACE FUNCTION public.get_recommended_products(_limit INTEGER DEFAULT 8)
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH viewed AS (
    SELECT pv.product_id, pv.view_count, pv.last_viewed_at, p.category, p.platform
    FROM public.product_views pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.user_id = _uid
  ),
  cat_weights AS (
    SELECT category, SUM(view_count)::float AS w
    FROM viewed GROUP BY category
  ),
  plat_weights AS (
    SELECT platform, SUM(view_count)::float AS w
    FROM viewed GROUP BY platform
  )
  SELECT p.*
  FROM public.products p
  LEFT JOIN cat_weights cw ON cw.category = p.category
  LEFT JOIN plat_weights pw ON pw.platform = p.platform
  WHERE p.is_active = true
    AND p.gift_denomination_id IS NULL
    AND p.stock > 0
    AND p.id NOT IN (SELECT product_id FROM viewed)
  ORDER BY
    (COALESCE(cw.w, 0) * 2 + COALESCE(pw.w, 0)) DESC,
    CASE WHEN p.boost_expires_at > now() THEN 1 ELSE 0 END DESC,
    p.rating DESC,
    p.reviews_count DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recommended_products(INTEGER) TO authenticated;
