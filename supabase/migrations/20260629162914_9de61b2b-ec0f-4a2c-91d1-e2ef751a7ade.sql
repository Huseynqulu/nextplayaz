
CREATE OR REPLACE FUNCTION public.admin_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_since timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'gmv', COALESCE(SUM(total) FILTER (WHERE status IN ('paid','delivered','completed','disputed')), 0),
        'commission', COALESCE(SUM(commission_amount) FILTER (WHERE status IN ('paid','delivered','completed','disputed')), 0),
        'orders', COUNT(*) FILTER (WHERE status IN ('paid','delivered','completed','disputed')),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'disputed', COUNT(*) FILTER (WHERE status = 'disputed'),
        'avg_order', COALESCE(AVG(total) FILTER (WHERE status IN ('paid','delivered','completed','disputed')), 0)
      )
      FROM public.orders WHERE created_at >= v_since
    ),
    'daily', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.day), '[]'::jsonb) FROM (
        SELECT
          date_trunc('day', created_at)::date AS day,
          COUNT(*) FILTER (WHERE status IN ('paid','delivered','completed','disputed')) AS orders,
          COALESCE(SUM(total) FILTER (WHERE status IN ('paid','delivered','completed','disputed')), 0) AS gmv,
          COALESCE(SUM(commission_amount) FILTER (WHERE status IN ('paid','delivered','completed','disputed')), 0) AS commission
        FROM public.orders
        WHERE created_at >= v_since
        GROUP BY 1
      ) t
    ),
    'top_sellers', (
      SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.gmv DESC), '[]'::jsonb) FROM (
        SELECT
          o.seller_id,
          COALESCE(p.shop_name, p.display_name, p.username, 'Satıcı') AS name,
          p.avatar_url,
          COUNT(*) AS orders,
          COALESCE(SUM(o.total), 0) AS gmv,
          COALESCE(SUM(o.commission_amount), 0) AS commission
        FROM public.orders o
        LEFT JOIN public.profiles p ON p.id = o.seller_id
        WHERE o.created_at >= v_since AND o.status IN ('paid','delivered','completed','disputed')
        GROUP BY o.seller_id, p.shop_name, p.display_name, p.username, p.avatar_url
        ORDER BY gmv DESC
        LIMIT 10
      ) s
    ),
    'categories', (
      SELECT COALESCE(jsonb_agg(row_to_json(c) ORDER BY c.gmv DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(pr.category, 'digər') AS category,
          COUNT(*) AS orders,
          COALESCE(SUM(o.total), 0) AS gmv
        FROM public.orders o
        LEFT JOIN public.products pr ON pr.id = o.product_id
        WHERE o.created_at >= v_since AND o.status IN ('paid','delivered','completed','disputed')
        GROUP BY 1
      ) c
    ),
    'new_users', (
      SELECT COALESCE(jsonb_agg(row_to_json(u) ORDER BY u.day), '[]'::jsonb) FROM (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS users
        FROM public.profiles
        WHERE created_at >= v_since
        GROUP BY 1
      ) u
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_analytics(integer) TO authenticated;
