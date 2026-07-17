
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON public.products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_active_created ON public.products (is_active, created_at DESC) WHERE gift_denomination_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_seller_active ON public.products (seller_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_boost ON public.products (boost_expires_at DESC NULLS LAST);
