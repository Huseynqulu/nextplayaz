-- Create audit table for automatic product covers
CREATE TABLE IF NOT EXISTS public.product_cover_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    normalized_title TEXT NOT NULL,
    igdb_game_id BIGINT,
    igdb_cover_id TEXT,
    confidence_score NUMERIC(5,2),
    storage_path TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.product_cover_audit ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.product_cover_audit TO authenticated;
GRANT ALL ON public.product_cover_audit TO service_role;

-- Policies
CREATE POLICY "Sellers can view their own cover audit logs"
ON public.product_cover_audit
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

-- Create a partial index for faster lookup if needed
CREATE INDEX IF NOT EXISTS idx_cover_audit_product ON public.product_cover_audit(product_id);
CREATE INDEX IF NOT EXISTS idx_cover_audit_seller ON public.product_cover_audit(seller_id);