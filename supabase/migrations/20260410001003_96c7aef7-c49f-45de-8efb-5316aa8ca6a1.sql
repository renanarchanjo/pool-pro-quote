
CREATE OR REPLACE FUNCTION public.get_store_public_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, city text, state text, whatsapp text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, name, slug, city, state, whatsapp
  FROM stores
  WHERE slug = _slug AND plan_status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_store_settings_public(_store_id uuid)
RETURNS TABLE(logo_url text, primary_color text, secondary_color text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT logo_url, primary_color, secondary_color
  FROM store_settings
  WHERE store_id = _store_id
  LIMIT 1;
$$;
