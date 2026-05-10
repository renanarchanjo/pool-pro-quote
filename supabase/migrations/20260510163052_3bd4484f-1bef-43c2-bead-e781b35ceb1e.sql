CREATE OR REPLACE FUNCTION public.get_stores_plan_price_public()
RETURNS TABLE(store_id uuid, price_monthly numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.id, COALESCE(sp.price_monthly, 0)
  FROM stores s
  LEFT JOIN subscription_plans sp ON sp.id = s.plan_id;
$function$;