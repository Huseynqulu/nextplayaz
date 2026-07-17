
CREATE POLICY "home_categories_read_all" ON storage.objects FOR SELECT USING (bucket_id = 'home-categories');
CREATE POLICY "home_categories_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'home-categories' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "home_categories_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'home-categories' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "home_categories_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'home-categories' AND public.has_role(auth.uid(), 'admin'));
