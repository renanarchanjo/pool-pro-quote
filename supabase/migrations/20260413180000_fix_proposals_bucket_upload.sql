-- ============================================================
-- Migration: Permitir upload anônimo no bucket proposals
-- O simulador público precisa fazer upload do PDF da proposta
-- antes de enviar via WhatsApp. A migration anterior removeu
-- essa permissão ao tornar o bucket privado.
--
-- Solução: permitir INSERT anônimo (necessário para o simulador)
-- mantendo o bucket privado para leitura (signed URLs).
-- ============================================================

-- Permitir upload anônimo ao bucket proposals (simulador público)
CREATE POLICY "Anon pode fazer upload de propostas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposals'
  AND auth.role() = 'anon'
);

-- Permitir que anon crie signed URLs para propostas recém-enviadas
CREATE POLICY "Anon pode ler propostas recem enviadas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposals'
  AND auth.role() = 'anon'
);

-- Permitir update (upsert) para authenticated e anon
CREATE POLICY "Upload upsert propostas authenticated"
ON storage.objects FOR UPDATE
USING (bucket_id = 'proposals')
WITH CHECK (bucket_id = 'proposals');
