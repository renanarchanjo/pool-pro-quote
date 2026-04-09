CREATE OR REPLACE FUNCTION public.get_platform_settings_public()
RETURNS TABLE(key text, value text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT key, value FROM platform_settings;
$$;