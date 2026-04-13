
-- Lojista autenticado faz upload na pasta da própria loja
CREATE POLICY "Loja faz upload de próprias propostas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] IN (
    SELECT store_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Lojista atualiza próprias propostas
CREATE POLICY "Loja atualiza próprias propostas"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] IN (
    SELECT store_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Super admin faz upload em qualquer loja
CREATE POLICY "Matriz upload proposals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proposals'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Lojista pode ler propostas da sua loja
CREATE POLICY "Loja lê próprias propostas"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] IN (
    SELECT store_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Super admin pode ler todas as propostas
CREATE POLICY "Matriz lê todas propostas"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposals'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);
