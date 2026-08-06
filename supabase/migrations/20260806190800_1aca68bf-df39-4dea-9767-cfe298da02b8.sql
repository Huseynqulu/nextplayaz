-- Extension for hero presentation in campaigns
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS hero_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hero_priority integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hero_badge_az text,
ADD COLUMN IF NOT EXISTS hero_badge_en text,
ADD COLUMN IF NOT EXISTS hero_badge_ru text,
ADD COLUMN IF NOT EXISTS hero_headline_az text,
ADD COLUMN IF NOT EXISTS hero_headline_en text,
ADD COLUMN IF NOT EXISTS hero_headline_ru text,
ADD COLUMN IF NOT EXISTS hero_description_az text,
ADD COLUMN IF NOT EXISTS hero_description_en text,
ADD COLUMN IF NOT EXISTS hero_description_ru text,
ADD COLUMN IF NOT EXISTS hero_cta_az text,
ADD COLUMN IF NOT EXISTS hero_cta_en text,
ADD COLUMN IF NOT EXISTS hero_cta_ru text,
ADD COLUMN IF NOT EXISTS hero_cta_dest text DEFAULT '/marketplace',
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS hero_theme text DEFAULT 'cyan';

-- Secure view for active hero campaigns (anonymous access allowed)
CREATE OR REPLACE VIEW public.active_hero_campaigns AS
SELECT 
    id,
    code,
    hero_badge_az, hero_badge_en, hero_badge_ru,
    hero_headline_az, hero_headline_en, hero_headline_ru,
    hero_description_az, hero_description_en, hero_description_ru,
    hero_cta_az, hero_cta_en, hero_cta_ru,
    hero_cta_dest,
    hero_image_url,
    hero_theme,
    hero_priority,
    discount_type,
    percent,
    fixed_amount
FROM public.discount_codes
WHERE 
    is_active = true 
    AND hero_enabled = true
    AND (start_at IS NULL OR start_at <= now())
    AND (expires_at IS NULL OR expires_at >= now())
    AND (max_uses IS NULL OR used_count < max_uses);

GRANT SELECT ON public.active_hero_campaigns TO anon, authenticated;

-- Seed YENI10 hero content (stays inactive per is_active = false)
UPDATE public.discount_codes
SET 
    hero_enabled = true,
    hero_badge_az = 'YENİ ÜZVLƏRƏ XÜSUSİ',
    hero_badge_en = 'NEW MEMBERS SPECIAL',
    hero_badge_ru = 'СПЕЦИАЛЬНО ДЛЯ НОВЫХ',
    hero_headline_az = 'İlk sifarişinə 10% endirim',
    hero_headline_en = '10% off your first order',
    hero_headline_ru = '10% скидка на первый заказ',
    hero_description_az = '20 AZN və üzəri seçilmiş məhsullarda maksimum 2 AZN endirim.',
    hero_description_en = 'Max 2 AZN discount on selected products of 20 AZN and above.',
    hero_description_ru = 'Макс. скидка 2 AZN на выбранные товары от 20 AZN.',
    hero_cta_az = 'Endirimi istifadə et',
    hero_cta_en = 'Use discount',
    hero_cta_ru = 'Использовать скидку',
    hero_theme = 'cyan'
WHERE code = 'YENI10';