-- Run AFTER creating the bucket in Supabase Dashboard:
-- Storage → New bucket → Name: participation-photos → Public bucket: ON

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view participation photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'participation-photos');

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
