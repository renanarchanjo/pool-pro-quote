-- ============================================================
-- Migration DEFINITIVA: Bucket proposals — limpa e recria
-- Data: 2026-04-13
--
-- Problema: múltiplas migrations conflitantes criaram/removeram
-- políticas no bucket proposals, causando 400 Bad Request no
-- upload do simulador público.
--
-- Solução: drop nuclear de TODAS as policies em storage.objects
-- e recriação limpa com acesso para anon + authenticated.
-- ============================================================

-- 1. Drop TODAS as policies em storage.objects (nuclear cleanup)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      pol.policyname
    );
  END LOOP;
END $$;

-- 2. Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Policies limpas — anon + authenticated
-- INSERT: simulador público (anon) e dashboard (authenticated)
CREATE POLICY "proposals_insert_all"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'proposals');

-- SELECT: necessário para signed URLs e Z-API
CREATE POLICY "proposals_select_all"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'proposals');

-- UPDATE: upsert funcionar corretamente
CREATE POLICY "proposals_update_all"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'proposals');

-- DELETE: permitir limpeza de PDFs antigos
CREATE POLICY "proposals_delete_all"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'proposals');
