GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.subcategories TO anon;
GRANT SELECT ON public.platforms TO anon;
GRANT SELECT ON public.platform_subcategories TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.site_announcements TO anon;
GRANT SELECT ON public.home_categories TO anon;
GRANT SELECT ON public.gift_platforms TO anon;
GRANT SELECT ON public.gift_denominations TO anon;
GRANT SELECT ON public.boost_pricing TO anon;
GRANT SELECT ON public.public_profiles TO anon;

GRANT EXECUTE ON FUNCTION public.get_homepage_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_category_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_recent_sales(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_seller_reviews(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_seller_stats(uuid) TO anon;