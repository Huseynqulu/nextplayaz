-- Table to cache IGDB suggestions for normalized titles
CREATE TABLE public.product_cover_suggestions (
    normalized_title TEXT PRIMARY KEY,
    suggestions JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.product_cover_suggestions TO authenticated;
GRANT ALL ON public.product_cover_suggestions TO service_role;

-- RLS
ALTER TABLE public.product_cover_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read/write suggestions (since it's a shared cache of public IGDB data)
CREATE POLICY "Public read access for suggestions" ON public.product_cover_suggestions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public insert/update for suggestions" ON public.product_cover_suggestions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Public update for suggestions" ON public.product_cover_suggestions
    FOR UPDATE TO authenticated USING (true);
