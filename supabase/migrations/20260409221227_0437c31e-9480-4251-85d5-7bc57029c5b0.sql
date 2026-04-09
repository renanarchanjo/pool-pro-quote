
-- PARTE 1: Rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
ON public.rate_limits FOR ALL
TO service_role
USING (true);

CREATE INDEX idx_rate_limits_identifier_action 
  ON public.rate_limits(identifier, action, window_start);

-- PARTE 2: Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX idx_audit_logs_user_id 
  ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX idx_audit_logs_action 
  ON public.audit_logs(action, created_at DESC);

-- PARTE 3: Trigger de auditoria em user_roles
CREATE OR REPLACE FUNCTION audit_user_roles_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action, table_name, record_id, 
    old_data, new_data
  ) VALUES (
    TG_OP,
    'user_roles',
    COALESCE(NEW.user_id::text, OLD.user_id::text),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb 
         ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb 
         ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_user_roles_changes();

-- PARTE 4: Trigger de auditoria em stores
CREATE OR REPLACE FUNCTION audit_stores_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.plan_status IS DISTINCT FROM NEW.plan_status OR
     OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    INSERT INTO public.audit_logs (
      action, table_name, record_id,
      old_data, new_data
    ) VALUES (
      'PLAN_CHANGE',
      'stores',
      NEW.id::text,
      jsonb_build_object(
        'plan_status', OLD.plan_status,
        'plan_id', OLD.plan_id,
        'plan_expires_at', OLD.plan_expires_at
      ),
      jsonb_build_object(
        'plan_status', NEW.plan_status,
        'plan_id', NEW.plan_id,
        'plan_expires_at', NEW.plan_expires_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_stores_plan
  AFTER UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION audit_stores_changes();

-- PARTE 5: Validação de preço em proposals
CREATE OR REPLACE FUNCTION validate_proposal_price()
RETURNS TRIGGER AS $$
DECLARE
  model_price DECIMAL;
BEGIN
  IF NEW.model_id IS NOT NULL THEN
    SELECT base_price INTO model_price
    FROM pool_models
    WHERE id = NEW.model_id AND active = true;
    
    IF model_price IS NULL THEN
      RAISE EXCEPTION 'Modelo inválido ou inativo';
    END IF;
    
    IF NEW.total_price < model_price * 0.5 THEN
      RAISE EXCEPTION 
        'Preço inválido: muito abaixo do valor base do modelo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_proposal_before_insert
  BEFORE INSERT OR UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION validate_proposal_price();
