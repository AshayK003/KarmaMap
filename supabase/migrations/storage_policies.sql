-- storage_policies.sql — storage buckets + object policies, idempotent.
--
-- Safe to run in any order relative to migrations 12 and 17: every policy
-- is dropped first, and the UPDATE definitions match the hardened versions
-- from migration 17 (USING + WITH CHECK), so this file can never regress them.
-- Buckets are created by SQL (no dashboard clicks needed).

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('participation-photos', 'participation-photos', true),
  ('ngo-qr-codes', 'ngo-qr-codes', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view participation photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view participation photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'participation-photos');

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
