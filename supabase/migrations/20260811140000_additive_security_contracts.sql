BEGIN;

CREATE OR REPLACE VIEW public.public_active_products
WITH (
  security_barrier = true,
  security_invoker = false
)
AS
SELECT
  p.id,
  p.seller_id,
  p.slug,
  p.title,
  p.description,
  p.price,
  p.old_price,
  p.platform,
  p.platform_subcategory,
  p.category,
  p.subcategory,
  p.image_url,
  p.image_urls,
  p.stock,
  p.rating,
  p.reviews_count,
  p.delivery,
  p.created_at,
  pg_catalog.date_trunc('hour'::text, p.last_sold_at) AS last_sold_at,
  p.boost_tier,
  p.boost_expires_at,
  (p.gift_denomination_id IS NOT NULL) AS is_gift_product,
  p.gift_denomination_id
FROM public.products p
WHERE p.is_active IS TRUE;

ALTER VIEW public.public_active_products OWNER TO postgres;

REVOKE ALL ON public.public_active_products
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.public_active_products
TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.get_recommended_products_public(
  _limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  slug text,
  title text,
  description text,
  price numeric,
  old_price numeric,
  platform text,
  platform_subcategory text,
  category text,
  subcategory text,
  image_url text,
  image_urls text[],
  stock integer,
  rating numeric,
  reviews_count integer,
  delivery public.delivery_type,
  created_at timestamp with time zone,
  last_sold_at timestamp with time zone,
  boost_tier text,
  boost_expires_at timestamp with time zone,
  is_gift_product boolean,
  gift_denomination_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _actual_limit integer :=
    LEAST(GREATEST(COALESCE(_limit, 8), 1), 20);
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH viewed AS (
    SELECT
      pv.product_id,
      pv.view_count,
      pv.last_viewed_at,
      viewed_product.category,
      viewed_product.platform
    FROM public.product_views pv
    JOIN public.products viewed_product
      ON viewed_product.id = pv.product_id
    WHERE pv.user_id = _uid
  ),
  cat_weights AS (
    SELECT
      v.category,
      SUM(v.view_count)::double precision AS w
    FROM viewed v
    GROUP BY v.category
  ),
  plat_weights AS (
    SELECT
      v.platform,
      SUM(v.view_count)::double precision AS w
    FROM viewed v
    GROUP BY v.platform
  )
  SELECT
    p.id,
    p.seller_id,
    p.slug,
    p.title,
    p.description,
    p.price,
    p.old_price,
    p.platform,
    p.platform_subcategory,
    p.category,
    p.subcategory,
    p.image_url,
    p.image_urls,
    p.stock,
    p.rating,
    p.reviews_count,
    p.delivery,
    p.created_at,
    pg_catalog.date_trunc('hour'::text, p.last_sold_at) AS last_sold_at,
    p.boost_tier,
    p.boost_expires_at,
    (p.gift_denomination_id IS NOT NULL) AS is_gift_product,
    NULL::uuid AS gift_denomination_id
  FROM public.products p
  LEFT JOIN cat_weights cw
    ON cw.category = p.category
  LEFT JOIN plat_weights pw
    ON pw.platform = p.platform
  WHERE p.is_active IS TRUE
    AND p.gift_denomination_id IS NULL
    AND p.stock > 0
    AND NOT EXISTS (
      SELECT 1
      FROM viewed v
      WHERE v.product_id = p.id
    )
  ORDER BY
    (
      COALESCE(cw.w, 0::double precision) * 2
      + COALESCE(pw.w, 0::double precision)
    ) DESC,
    CASE
      WHEN p.boost_expires_at > pg_catalog.now() THEN 1
      ELSE 0
    END DESC,
    p.rating DESC,
    p.reviews_count DESC
  LIMIT _actual_limit;
END;
$function$;

ALTER FUNCTION public.get_recommended_products_public(integer)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.get_recommended_products_public(integer)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.get_recommended_products_public(integer)
TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_conversation_product_context(
  p_conversation_id uuid
)
RETURNS TABLE (
  title text,
  slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    p.title,
    p.slug
  FROM public.conversations c
  JOIN public.products p
    ON p.id = c.product_id
  WHERE c.id = p_conversation_id
    AND auth.uid() IS NOT NULL
    AND (
      c.user_a = auth.uid()
      OR c.user_b = auth.uid()
    )
  LIMIT 1;
$function$;

ALTER FUNCTION public.get_conversation_product_context(uuid)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.get_conversation_product_context(uuid)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.get_conversation_product_context(uuid)
TO authenticated, service_role;

COMMIT;
