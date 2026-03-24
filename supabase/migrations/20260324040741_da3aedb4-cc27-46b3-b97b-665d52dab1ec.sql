
-- Tabela de log de notificações push
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  priority text NOT NULL DEFAULT 'NORMAL',
  title text NOT NULL,
  message text NOT NULL,
  hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para deduplicação por hash + dia
CREATE INDEX idx_notification_logs_hash_date ON public.notification_logs (hash, created_at);

-- Index para controle de spam por usuário + tipo
CREATE INDEX idx_notification_logs_user_type ON public.notification_logs (user_id, alert_type, created_at);

-- Habilitar RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: super_admin pode gerenciar tudo
CREATE POLICY "Super admins full access notification_logs"
  ON public.notification_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Usuários autenticados podem ver seus próprios logs
CREATE POLICY "Users can view own notification_logs"
  ON public.notification_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Tabela para mapear user_id ao onesignal_player_id
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  onesignal_player_id text,
  onesignal_subscription_id text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push_subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins full access push_subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Habilitar extensões para cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
