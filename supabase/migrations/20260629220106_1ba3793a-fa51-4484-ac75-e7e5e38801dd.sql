
-- Gift platforms (PlayStation, Steam, Netflix, Xbox, etc.)
CREATE TABLE public.gift_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gift_platforms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_platforms TO authenticated;
GRANT ALL ON public.gift_platforms TO service_role;

ALTER TABLE public.gift_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_platforms_select_all" ON public.gift_platforms
  FOR SELECT USING (true);

CREATE POLICY "gift_platforms_admin_manage" ON public.gift_platforms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Denominations per platform (250 TL, 500 TL, 50 USD, etc.)
CREATE TABLE public.gift_denominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.gift_platforms(id) ON DELETE CASCADE,
  face_value numeric(12,2) NOT NULL,
  currency text NOT NULL,
  region text,
  label text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_id, face_value, currency, region)
);

CREATE INDEX gift_denominations_platform_idx ON public.gift_denominations(platform_id);

GRANT SELECT ON public.gift_denominations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_denominations TO authenticated;
GRANT ALL ON public.gift_denominations TO service_role;

ALTER TABLE public.gift_denominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gift_denominations_select_all" ON public.gift_denominations
  FOR SELECT USING (true);

CREATE POLICY "gift_denominations_admin_manage" ON public.gift_denominations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add denomination link to products (nullable; only set for gift card listings)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gift_denomination_id uuid REFERENCES public.gift_denominations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_gift_denomination_idx ON public.products(gift_denomination_id);

-- updated_at triggers
CREATE TRIGGER gift_platforms_updated_at BEFORE UPDATE ON public.gift_platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gift_denominations_updated_at BEFORE UPDATE ON public.gift_denominations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed common platforms
INSERT INTO public.gift_platforms (slug, name, sort_order) VALUES
  ('playstation', 'PlayStation', 1),
  ('steam', 'Steam', 2),
  ('xbox', 'Xbox', 3),
  ('netflix', 'Netflix', 4),
  ('spotify', 'Spotify', 5),
  ('itunes', 'iTunes / App Store', 6),
  ('google-play', 'Google Play', 7),
  ('amazon', 'Amazon', 8)
ON CONFLICT (slug) DO NOTHING;

-- Seed sample PlayStation TL denominations
INSERT INTO public.gift_denominations (platform_id, face_value, currency, region, sort_order)
SELECT id, v, 'TL', 'TR', ROW_NUMBER() OVER ()
FROM public.gift_platforms, (VALUES (100), (250), (500), (1000), (2000)) AS t(v)
WHERE slug = 'playstation'
ON CONFLICT DO NOTHING;

-- Seed sample Steam USD denominations
INSERT INTO public.gift_denominations (platform_id, face_value, currency, region, sort_order)
SELECT id, v, 'USD', 'US', ROW_NUMBER() OVER ()
FROM public.gift_platforms, (VALUES (5), (10), (20), (50), (100)) AS t(v)
WHERE slug = 'steam'
ON CONFLICT DO NOTHING;
