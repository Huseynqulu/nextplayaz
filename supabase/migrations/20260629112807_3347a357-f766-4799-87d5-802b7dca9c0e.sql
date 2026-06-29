
CREATE POLICY "Admins can read seller verification files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'seller-verification' AND public.has_role(auth.uid(), 'admin'));
