-- Add composite indexes to speed up hot product listing queries
CREATE INDEX IF NOT EXISTS idx_products_list_boost_created
  ON public.products (boost_expires_at DESC NULLS LAST, created_at DESC)
  WHERE is_active = true AND gift_denomination_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_seller_created
  ON public.products (seller_id, created_at DESC);

ANALYZE public.products;