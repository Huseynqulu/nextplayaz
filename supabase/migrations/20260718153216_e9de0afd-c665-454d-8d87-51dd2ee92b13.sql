CREATE OR REPLACE FUNCTION public.get_seller_reviews(p_seller_id uuid)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  rating integer,
  comment text,
  created_at timestamptz,
  reviewer_id uuid,
  seller_reply text,
  seller_replied_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.product_id, r.rating, r.comment, r.created_at, r.reviewer_id, r.seller_reply, r.seller_replied_at
  FROM public.reviews r
  JOIN public.products p ON p.id = r.product_id
  WHERE p.seller_id = p_seller_id
  ORDER BY r.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_reviews(uuid) TO anon, authenticated;