
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL REFERENCES public.categories(slug) ON DELETE CASCADE,
  slug text NOT NULL,
  label_az text NOT NULL,
  label_en text NOT NULL,
  label_ru text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_slug, slug)
);

GRANT SELECT ON public.subcategories TO anon, authenticated;
GRANT ALL ON public.subcategories TO service_role;

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategories viewable by everyone"
  ON public.subcategories FOR SELECT USING (true);

CREATE POLICY "Admins manage subcategories"
  ON public.subcategories FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;
GRANT UPDATE (subcategory) ON public.products TO authenticated;
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products(category, subcategory);

CREATE OR REPLACE FUNCTION public.admin_upsert_subcategory(
  p_category_slug text, p_slug text,
  p_label_az text, p_label_en text, p_label_ru text,
  p_sort_order integer DEFAULT 0, p_is_active boolean DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  INSERT INTO public.subcategories (category_slug, slug, label_az, label_en, label_ru, sort_order, is_active)
  VALUES (p_category_slug, p_slug, p_label_az, p_label_en, p_label_ru, p_sort_order, p_is_active)
  ON CONFLICT (category_slug, slug) DO UPDATE SET
    label_az = EXCLUDED.label_az, label_en = EXCLUDED.label_en, label_ru = EXCLUDED.label_ru,
    sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_subcategory(p_category_slug text, p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF EXISTS (SELECT 1 FROM public.products WHERE category = p_category_slug AND subcategory = p_slug) THEN
    RAISE EXCEPTION 'Bu alt-kateqoriyada məhsullar var, silinə bilməz';
  END IF;
  DELETE FROM public.subcategories WHERE category_slug = p_category_slug AND slug = p_slug;
END $$;
