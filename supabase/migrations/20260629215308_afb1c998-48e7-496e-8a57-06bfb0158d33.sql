
-- Platforms table (admin-managed)
CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_az text NOT NULL,
  label_en text NOT NULL,
  label_ru text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platforms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platforms TO authenticated;
GRANT ALL ON public.platforms TO service_role;

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active platforms"
  ON public.platforms FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage platforms"
  ON public.platforms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_platforms_updated_at
  BEFORE UPDATE ON public.platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform subcategories (admin-managed, under each platform)
CREATE TABLE public.platform_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_slug text NOT NULL REFERENCES public.platforms(slug) ON DELETE CASCADE ON UPDATE CASCADE,
  slug text NOT NULL,
  label_az text NOT NULL,
  label_en text NOT NULL,
  label_ru text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_slug, slug)
);

GRANT SELECT ON public.platform_subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_subcategories TO authenticated;
GRANT ALL ON public.platform_subcategories TO service_role;

ALTER TABLE public.platform_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active platform subcategories"
  ON public.platform_subcategories FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage platform subcategories"
  ON public.platform_subcategories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_platform_subcategories_updated_at
  BEFORE UPDATE ON public.platform_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add platform_subcategory column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS platform_subcategory text;

-- Seed default platforms based on current static list
INSERT INTO public.platforms (slug, label_az, label_en, label_ru, sort_order) VALUES
  ('steam',       'Steam',        'Steam',        'Steam',        10),
  ('ps5',         'PS5',          'PS5',          'PS5',          20),
  ('ps4',         'PS4',          'PS4',          'PS4',          30),
  ('xbox',        'Xbox',         'Xbox',         'Xbox',         40),
  ('ea',          'EA',           'EA',           'EA',           50),
  ('battle-net',  'Battle.net',   'Battle.net',   'Battle.net',   60),
  ('epic',        'Epic',         'Epic',         'Epic',         70),
  ('rockstar',    'Rockstar',     'Rockstar',     'Rockstar',     80)
ON CONFLICT (slug) DO NOTHING;
