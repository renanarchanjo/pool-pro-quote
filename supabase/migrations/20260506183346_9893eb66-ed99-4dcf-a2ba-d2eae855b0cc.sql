CREATE OR REPLACE FUNCTION public.protect_locked_pool_models()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    -- Only price-related editable by stores: base_price, cost, margin_percent.
    -- included_items is a derived proposal snapshot maintained from model_included_items.
    NEW.name := OLD.name;
    NEW.category_id := OLD.category_id;
    NEW.length := OLD.length;
    NEW.width := OLD.width;
    NEW.depth := OLD.depth;
    NEW.photo_url := OLD.photo_url;
    NEW.differentials := OLD.differentials;
    NEW.not_included_items := OLD.not_included_items;
    NEW.delivery_days := OLD.delivery_days;
    NEW.installation_days := OLD.installation_days;
    NEW.payment_terms := OLD.payment_terms;
    NEW.notes := OLD.notes;
    NEW.partner_locked := OLD.partner_locked;
    NEW.partner_locked_source := OLD.partner_locked_source;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.get_model_included_items_public(_model_id uuid)
RETURNS TABLE(name text, quantity integer, price numeric, item_type text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT mi.name, mi.quantity, mi.price, mi.item_type
  FROM public.model_included_items AS mi
  JOIN public.pool_models AS pm ON pm.id = mi.model_id
  WHERE mi.model_id = _model_id
    AND mi.active = true
    AND pm.active = true
  ORDER BY mi.display_order, mi.created_at, mi.id;
$function$;

DO $$
DECLARE
  model_record record;
BEGIN
  FOR model_record IN SELECT id FROM public.pool_models LOOP
    PERFORM public.sync_pool_model_included_items(model_record.id);
  END LOOP;
END;
$$;