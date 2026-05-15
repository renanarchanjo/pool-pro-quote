-- 1. Revoke EXECUTE on log_security_event from authenticated/anon roles.
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, uuid, text, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, uuid, text, jsonb) TO service_role;

-- 2. Drop overly permissive storage policies on `proposals` bucket.
DROP POLICY IF EXISTS "proposals_select_public"             ON storage.objects;
DROP POLICY IF EXISTS "proposals_update_authenticated"      ON storage.objects;
DROP POLICY IF EXISTS "proposals_insert_authenticated"      ON storage.objects;
DROP POLICY IF EXISTS "Leitura proposta autenticado"        ON storage.objects;
DROP POLICY IF EXISTS "Upload proposta autenticado"         ON storage.objects;
DROP POLICY IF EXISTS "Update proposta autenticado"         ON storage.objects;

-- 3. Allow users to read their own notification logs.
CREATE POLICY "Users can read own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());