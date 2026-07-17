
CREATE TABLE public.home_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text NOT NULL DEFAULT '/marketplace',
  product_count_query text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_categories TO authenticated;
GRANT ALL ON public.home_categories TO service_role;

ALTER TABLE public.home_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_categories public read active"
  ON public.home_categories FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "home_categories admin insert"
  ON public.home_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "home_categories admin update"
  ON public.home_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "home_categories admin delete"
  ON public.home_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_home_categories_updated_at
  BEFORE UPDATE ON public.home_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with screenshot-inspired defaults
INSERT INTO public.home_categories (title, subtitle, link_url, sort_order) VALUES
  ('PlayStation Oyunları', 'PS4 / PS5 oyunları', '/marketplace?platform=playstation', 1),
  ('PC Oyunları',          'Steam · Epic · GOG',   '/marketplace?platform=pc',         2),
  ('Xbox Oyunları',        'Xbox One / Series',    '/marketplace?platform=xbox',       3),
  ('PlayStation Hədiyyə Kartları', 'PSN Wallet',   '/gift-cards/playstation',          4),
  ('Steam Hədiyyə Kartları',       'Steam Wallet', '/gift-cards/steam',                5),
  ('Xbox Hədiyyə Kartları',        'Xbox Wallet',  '/gift-cards/xbox',                 6),
  ('Xbox Game Pass',       'Ultimate · PC',        '/marketplace?q=game+pass',         7),
  ('Lisenziya Xidmətləri', 'Netflix · Spotify · Adobe', '/marketplace?cat=Services',   8);
