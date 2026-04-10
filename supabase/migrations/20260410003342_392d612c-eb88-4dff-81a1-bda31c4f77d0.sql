-- Política de leitura pública para store-logos
CREATE POLICY "Public read store-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

-- Política de leitura pública para partner-logos
CREATE POLICY "Public read partner-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-logos');