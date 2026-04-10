-- Cria bucket proposals público
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer um pode ler (necessário para Z-API)
CREATE POLICY "Public read proposals"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposals');

-- Política: apenas autenticados podem fazer upload
CREATE POLICY "Authenticated upload proposals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposals');

-- Política: usuário pode deletar seus próprios arquivos
CREATE POLICY "Owner delete proposals"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proposals');