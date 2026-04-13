-- ============================================================
-- Migration: Correções de segurança identificadas pelo Lovable
-- Data: 2026-04-13
-- 1. Bucket proposals → privado
-- 2. Realtime → restrito por loja
-- 3. Notification logs → leitura por usuário
-- ============================================================

-- ==================== 1. BUCKET PROPOSALS — PRIVADO ====================

-- Tornar bucket privado (remove acesso público direto)
UPDATE storage.buckets
SET public = false
WHERE id = 'proposals';

-- Remover políticas públicas existentes
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read proposals" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous read access to proposals" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload to proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read own store proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload proposals" ON storage.objects;

-- Loja acessa apenas suas próprias propostas
CREATE POLICY "Loja acessa proprias propostas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposals'
  AND auth.uid() IN (
    SELECT p.id FROM profiles p
    WHERE p.store_id = (
      SELECT pr.store_id FROM proposals pr
      WHERE pr.id::text = (storage.foldername(name))[1]
      LIMIT 1
    )
  )
);

-- Loja pode fazer upload de propostas
CREATE POLICY "Loja faz upload de propostas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposals'
  AND auth.role() = 'authenticated'
);

-- Super admin acessa todas as propostas
CREATE POLICY "Matriz acessa todas as propostas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposals'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ==================== 2. REALTIME — RESTRINGIR POR LOJA ====================

-- Habilita RLS no Realtime (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

    -- Usuário só escuta canal da própria loja
    DROP POLICY IF EXISTS "Realtime por loja" ON realtime.messages;
    CREATE POLICY "Realtime por loja"
    ON realtime.messages FOR SELECT
    USING (
      split_part(topic, ':', 2) IN (
        SELECT store_id::text FROM profiles
        WHERE id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
      )
    );
  END IF;
END;
$$;

-- ==================== 3. NOTIFICATION LOGS — LEITURA PRÓPRIA ====================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notification_logs;
DROP POLICY IF EXISTS "Usuario le proprios logs" ON public.notification_logs;

-- Usuário lê apenas seus próprios logs
CREATE POLICY "Usuario le proprios logs"
ON public.notification_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());
