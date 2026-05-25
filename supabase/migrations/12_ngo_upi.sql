ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_qr_url TEXT;

CREATE POLICY "Public can view NGO profiles"
  ON public.profiles FOR SELECT TO anon
  USING (role = 'ngo');

-- Create bucket manually in Supabase Dashboard:
-- Storage → New bucket → Name: ngo-qr-codes → Public bucket: ON

CREATE POLICY "NGOs can upload own QR codes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ngo-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view NGO QR codes"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'ngo-qr-codes');

CREATE POLICY "NGOs can update own QR codes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ngo-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "NGOs can delete own QR codes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ngo-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);
