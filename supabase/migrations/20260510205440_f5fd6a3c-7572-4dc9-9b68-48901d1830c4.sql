DROP FUNCTION IF EXISTS public.get_store_public_by_id(uuid);
CREATE FUNCTION public.get_store_public_by_id(_id uuid)
RETURNS TABLE(id uuid, name text, slug text, city text, state text, offers_alvenaria boolean, offers_vinil boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, name, slug, city, state, offers_alvenaria, offers_vinil
  FROM stores WHERE id = _id LIMIT 1;
$function$;