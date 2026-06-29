
CREATE OR REPLACE FUNCTION public.get_seller_stats(p_seller_id uuid)
RETURNS TABLE(completed_sales bigint, avg_rating numeric, reviews_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.orders
       WHERE seller_id = p_seller_id AND status = 'completed')::bigint AS completed_sales,
    COALESCE((SELECT round(avg(r.rating)::numeric, 2)
       FROM public.reviews r
       JOIN public.products p ON p.id = r.product_id
       WHERE p.seller_id = p_seller_id), 0)::numeric AS avg_rating,
    (SELECT count(*) FROM public.reviews r
       JOIN public.products p ON p.id = r.product_id
       WHERE p.seller_id = p_seller_id)::bigint AS reviews_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_stats(uuid) TO anon, authenticated;
