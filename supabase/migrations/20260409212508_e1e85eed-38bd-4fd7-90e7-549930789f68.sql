
-- CORREÇÃO 1 — platform_settings restrita a super_admin
DROP FUNCTION IF EXISTS public.get_platform_settings_public();

CREATE OR REPLACE FUNCTION public.get_platform_settings_public()
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT ps.key, ps.value FROM platform_settings ps;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_platform_settings_public() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_platform_settings_public() TO authenticated;

-- CORREÇÃO 2 — proposals: drop políticas existentes e recriar
DROP POLICY IF EXISTS "Public can insert proposals for valid stores" ON public.proposals;
DROP POLICY IF EXISTS "Anyone can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Owners can view their store proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can view their store proposals" ON public.proposals;
DROP POLICY IF EXISTS "Store members can view own proposals" ON public.proposals;
DROP POLICY IF EXISTS "Users can update their store proposals" ON public.proposals;
DROP POLICY IF EXISTS "Store members can update own proposals" ON public.proposals;

CREATE POLICY "Anyone can create proposals"
ON public.proposals FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_id IS NOT NULL
  AND store_exists(store_id)
  AND total_price > 0
  AND (created_by IS NULL OR created_by = auth.uid())
);

CREATE POLICY "Store members can view own proposals"
ON public.proposals FOR SELECT
TO authenticated
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Store members can update own proposals"
ON public.proposals FOR UPDATE
TO authenticated
USING (
  (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Keep existing super_admin delete policy untouched

-- CORREÇÃO 3 — notification_logs isolada por usuário
DROP POLICY IF EXISTS "Users can view own notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notification_logs;

CREATE POLICY "Users can insert own notifications"
ON public.notification_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

-- CORREÇÃO 4 — lead_logs consolidar
DROP POLICY IF EXISTS "Stores can view their lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Stores can insert their lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Store members can view lead_logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Store members can insert lead_logs" ON public.lead_logs;

CREATE POLICY "Store members can view lead_logs"
ON public.lead_logs FOR SELECT
TO authenticated
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Store members can insert lead_logs"
ON public.lead_logs FOR INSERT
TO authenticated
WITH CHECK (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- CORREÇÃO 5 — user_roles: owners podem ver roles da loja
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super_admin can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Only super_admin can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
