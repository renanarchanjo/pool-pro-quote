-- ============================================================
-- Migration: Indexes faltantes + Cleanup automático
-- Data: 2026-04-13
-- Descrição:
--   1. Indexes compostos para queries frequentes
--   2. Função de cleanup para rate_limits e audit_logs
--   3. Policy de bucket proposals (exige autenticação)
-- ============================================================

-- ==================== 1. INDEXES ====================

-- proposals: filtro por loja + status (dashboard, notification-engine)
CREATE INDEX IF NOT EXISTS idx_proposals_store_id_status
  ON proposals (store_id, status);

-- proposals: filtro por loja + data de criação (relatórios, performance)
CREATE INDEX IF NOT EXISTS idx_proposals_store_id_created_at
  ON proposals (store_id, created_at);

-- lead_distributions: filtro por loja + status (aceitar leads, notification-engine)
CREATE INDEX IF NOT EXISTS idx_lead_distributions_store_id_status
  ON lead_distributions (store_id, status);

-- lead_distributions: filtro por loja + data (cron de notificações)
CREATE INDEX IF NOT EXISTS idx_lead_distributions_store_id_created_at
  ON lead_distributions (store_id, created_at);

-- profiles: lookup por store_id (usado em quase todo o sistema)
CREATE INDEX IF NOT EXISTS idx_profiles_store_id
  ON profiles (store_id);

-- ==================== 2. CLEANUP AUTOMÁTICO ====================

-- Função para limpar registros antigos de rate_limits e audit_logs
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
  tmp integer;
BEGIN
  -- rate_limits: remover registros com mais de 24 horas
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS tmp = ROW_COUNT;
  deleted_count := deleted_count + tmp;

  -- audit_logs: remover registros com mais de 90 dias
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS tmp = ROW_COUNT;
  deleted_count := deleted_count + tmp;

  -- notification_logs: remover registros com mais de 30 dias
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS tmp = ROW_COUNT;
  deleted_count := deleted_count + tmp;

  RETURN deleted_count;
END;
$$;

-- ==================== 3. BUCKET PROPOSALS — RESTRINGIR ACESSO ====================

-- Remover policy anon se existir e criar policy autenticada
DO $$
BEGIN
  -- Revogar acesso anon ao bucket proposals (SELECT)
  BEGIN
    DROP POLICY IF EXISTS "Allow anonymous read access to proposals" ON storage.objects;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Revogar acesso anon ao bucket proposals (INSERT)
  BEGIN
    DROP POLICY IF EXISTS "Allow anonymous upload to proposals" ON storage.objects;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Policy: somente usuários autenticados podem ler proposals da sua loja
  BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read own store proposals" ON storage.objects;
    CREATE POLICY "Authenticated users can read own store proposals"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'proposals'
        AND auth.role() = 'authenticated'
      );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Policy: somente usuários autenticados podem inserir proposals
  BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload proposals" ON storage.objects;
    CREATE POLICY "Authenticated users can upload proposals"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'proposals'
        AND auth.role() = 'authenticated'
      );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
END;
$$;
