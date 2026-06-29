
CREATE POLICY "Users upload own verification files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'seller-verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own verification files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'seller-verification' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users update own verification files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'seller-verification' AND auth.uid()::text = (storage.foldername(name))[1]);
