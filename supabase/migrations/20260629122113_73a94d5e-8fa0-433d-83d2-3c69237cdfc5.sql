
ALTER TABLE public.products ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.seller_applications ALTER COLUMN category TYPE text USING category::text;
DROP TYPE IF EXISTS public.product_category;

CREATE TABLE public.categories (
  slug text PRIMARY KEY,
  label_az text NOT NULL,
  label_en text NOT NULL,
  label_ru text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (slug, label_az, label_en, label_ru, sort_order) VALUES
  ('Games',    'Oyunlar',   'Games',    'Игры',     1),
  ('Accounts', 'Hesablar',  'Accounts', 'Аккаунты', 2),
  ('Keys',     'Açarlar',   'Keys',     'Ключи',    3),
  ('Services', 'Xidmətlər', 'Services', 'Услуги',   4)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
END; $$;
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles public read') THEN
    CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_category(
  p_slug text, p_label_az text, p_label_en text, p_label_ru text,
  p_sort_order integer DEFAULT 0, p_is_active boolean DEFAULT true, p_icon text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  INSERT INTO public.categories (slug,label_az,label_en,label_ru,sort_order,is_active,icon)
  VALUES (p_slug,p_label_az,p_label_en,p_label_ru,p_sort_order,p_is_active,p_icon)
  ON CONFLICT (slug) DO UPDATE SET
    label_az=EXCLUDED.label_az, label_en=EXCLUDED.label_en, label_ru=EXCLUDED.label_ru,
    sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, icon=EXCLUDED.icon, updated_at=now();
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_category(text,text,text,text,integer,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_category(text,text,text,text,integer,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_category(p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF EXISTS (SELECT 1 FROM public.products WHERE category = p_slug) THEN
    RAISE EXCEPTION 'Category has products, cannot delete';
  END IF;
  DELETE FROM public.categories WHERE slug = p_slug;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_category(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_category(text) TO authenticated;
