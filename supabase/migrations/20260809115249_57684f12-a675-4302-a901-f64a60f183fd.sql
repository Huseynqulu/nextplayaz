BEGIN;

DO $migration_guard$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION
      'Phase 0B-1C must execute as postgres. Current role: %',
      current_user;
  END IF;
END
$migration_guard$;

CREATE VIEW public.public_active_products
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
  date_trunc('hour', p.last_sold_at) AS last_sold_at,
  p.boost_tier,
  p.boost_expires_at,
  (p.gift_denomination_id IS NOT NULL) AS is_gift_product
FROM public.products AS p
WHERE p.is_active IS TRUE;

ALTER VIEW public.public_active_products OWNER TO postgres;

REVOKE ALL PRIVILEGES
ON TABLE public.public_active_products
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.public_active_products
TO anon, authenticated;

CREATE FUNCTION public.get_recent_sales_public(
  _limit integer DEFAULT 10
)
RETURNS TABLE (
  product_title text,
  product_slug text,
  buyer_name_masked text,
  display_price numeric,
  sold_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH recent_sales AS (
    SELECT
      p.title AS product_title,
      p.slug AS product_slug,
      p.price AS display_price,
      date_trunc('hour', o.created_at) AS sold_at,
      o.created_at AS raw_created_at,
      COALESCE(
        NULLIF(btrim(pr.display_name), ''),
        NULLIF(btrim(pr.username), ''),
        ''
      ) AS raw_name
    FROM public.orders AS o
    INNER JOIN public.products AS p
      ON p.id = o.product_id
    LEFT JOIN public.profiles AS pr
      ON pr.id = o.buyer_id
    WHERE o.status::text = 'completed'
      AND p.is_active IS TRUE
    ORDER BY o.created_at DESC
    LIMIT LEAST(
      GREATEST(COALESCE(_limit, 10), 1),
      20
    )
  )
  SELECT
    recent_sales.product_title,
    recent_sales.product_slug,
    CASE
      WHEN recent_sales.raw_name = ''
        THEN 'Müştəri'
      WHEN char_length(recent_sales.raw_name) = 1
        THEN left(recent_sales.raw_name, 1) || repeat('*', 3)
      ELSE
        left(recent_sales.raw_name, 1)
        || repeat('*', 3)
        || right(recent_sales.raw_name, 1)
    END AS buyer_name_masked,
    recent_sales.display_price,
    recent_sales.sold_at
  FROM recent_sales
  ORDER BY recent_sales.raw_created_at DESC;
$function$;

ALTER FUNCTION public.get_recent_sales_public(integer)
OWNER TO postgres;

REVOKE ALL PRIVILEGES
ON FUNCTION public.get_recent_sales_public(integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_recent_sales_public(integer)
TO anon, authenticated;

COMMIT;