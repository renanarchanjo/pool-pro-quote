
DROP POLICY IF EXISTS "Authenticated upload proposals" ON storage.objects;
DROP POLICY IF EXISTS "Public read proposals" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete proposals" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload proposals" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete proposals" ON storage.objects;

CREATE POLICY "Anyone can upload proposals"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proposals');

CREATE POLICY "Public read proposals"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposals');

CREATE POLICY "Anyone can delete proposals"
ON storage.objects FOR DELETE
USING (bucket_id = 'proposals');
