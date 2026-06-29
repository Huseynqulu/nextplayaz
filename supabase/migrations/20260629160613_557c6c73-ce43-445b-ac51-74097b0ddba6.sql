GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, username, display_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (username, display_name, shop_name, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;