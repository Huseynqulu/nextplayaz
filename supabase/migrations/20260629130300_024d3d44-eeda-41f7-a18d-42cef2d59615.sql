
CREATE POLICY "product-images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product-images sellers upload own folder" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "product-images sellers update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "product-images sellers delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
