-- Extension for hero placement and countdowns
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS hero_placement text DEFAULT 'main_carousel' CHECK (hero_placement IN ('announcement', 'main_carousel', 'side_top', 'side_bottom')),
ADD COLUMN IF NOT EXISTS hero_countdown_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hero_featured_product_id uuid REFERENCES public.products(id),
ADD COLUMN IF NOT EXISTS hero_featured_category_id uuid REFERENCES public.home_categories(id),
ADD COLUMN IF NOT EXISTS hero_image_url_mobile text;

-- Drop and recreate the secure view to include new fields
DROP VIEW IF EXISTS public.active_hero_campaigns;

CREATE VIEW public.active_hero_campaigns AS
SELECT 
    id,
    code,
    hero_badge_az, hero_badge_en, hero_badge_ru,
    hero_headline_az, hero_headline_en, hero_headline_ru,
    hero_description_az, hero_description_en, hero_description_ru,
    hero_cta_az, hero_cta_en, hero_cta_ru,
    hero_cta_dest,
    hero_image_url,
    hero_image_url_mobile,
    hero_theme,
    hero_priority,
    hero_placement,
    hero_countdown_enabled,
    hero_featured_product_id,
    hero_featured_category_id,
    discount_type,
    percent,
    fixed_amount,
    expires_at as ends_at
FROM public.discount_codes
WHERE 
    is_active = true 
    AND hero_enabled = true
    AND (start_at IS NULL OR start_at <= now())
    AND (expires_at IS NULL OR expires_at >= now())
    AND (max_uses IS NULL OR used_count < max_uses);

GRANT SELECT ON public.active_hero_campaigns TO anon, authenticated;