
CREATE OR REPLACE FUNCTION public.get_homepage_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'sellers', (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role = 'seller'),
    'products', (SELECT count(*) FROM public.products WHERE is_active = true),
    'orders', (SELECT count(*) FROM public.orders WHERE status IN ('completed','delivered'))
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_homepage_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_category_counts()
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT category::text, count(*)::bigint
  FROM public.products
  WHERE is_active = true
  GROUP BY category;
$$;
GRANT EXECUTE ON FUNCTION public.get_category_counts() TO anon, authenticated;
