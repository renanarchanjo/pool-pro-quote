
-- Política simplificada: qualquer autenticado pode fazer upload
CREATE POLICY "Upload proposta autenticado"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proposals'
);

-- Política simplificada: qualquer autenticado pode atualizar
CREATE POLICY "Update proposta autenticado"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'proposals'
);

-- Política simplificada: qualquer autenticado pode ler
CREATE POLICY "Leitura proposta autenticado"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposals'
);
