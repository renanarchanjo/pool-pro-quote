CREATE OR REPLACE FUNCTION public.sync_pool_model_included_items(_model_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pool_models AS pm
  SET included_items = COALESCE((
    SELECT array_agg(
      CASE
        WHEN COALESCE(mi.quantity, 1) > 1 THEN concat(mi.quantity, 'x ', CASE WHEN mi.item_type = 'mao_de_obra' THEN '[MO] ' ELSE '' END, mi.name)
        ELSE concat(CASE WHEN mi.item_type = 'mao_de_obra' THEN '[MO] ' ELSE '' END, mi.name)
      END
      ORDER BY mi.display_order, mi.created_at, mi.id
    )
    FROM public.model_included_items AS mi
    WHERE mi.model_id = _model_id
      AND mi.active = true
  ), ARRAY[]::text[]),
  updated_at = now()
  WHERE pm.id = _model_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pool_model_included_items_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_pool_model_included_items(OLD.model_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_pool_model_included_items(NEW.model_id);

  IF TG_OP = 'UPDATE' AND OLD.model_id IS DISTINCT FROM NEW.model_id THEN
    PERFORM public.sync_pool_model_included_items(OLD.model_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pool_model_included_items ON public.model_included_items;
CREATE TRIGGER trg_sync_pool_model_included_items
AFTER INSERT OR UPDATE OR DELETE ON public.model_included_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_pool_model_included_items_trigger();

CREATE OR REPLACE FUNCTION public.get_pool_models_public(_store_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  id uuid,
  name text,
  category_id uuid,
  base_price numeric,
  delivery_days integer,
  installation_days integer,
  active boolean,
  store_id uuid,
  length numeric,
  width numeric,
  depth numeric,
  display_order integer,
  differentials text[],
  included_items text[],
  not_included_items text[],
  photo_url text,
  payment_terms text,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    pm.id,
    pm.name,
    pm.category_id,
    pm.base_price,
    pm.delivery_days,
    pm.installation_days,
    pm.active,
    pm.store_id,
    pm.length,
    pm.width,
    pm.depth,
    pm.display_order,
    pm.differentials,
    COALESCE((
      SELECT array_agg(
        CASE
          WHEN COALESCE(mi.quantity, 1) > 1 THEN concat(mi.quantity, 'x ', CASE WHEN mi.item_type = 'mao_de_obra' THEN '[MO] ' ELSE '' END, mi.name)
          ELSE concat(CASE WHEN mi.item_type = 'mao_de_obra' THEN '[MO] ' ELSE '' END, mi.name)
        END
        ORDER BY mi.display_order, mi.created_at, mi.id
      )
      FROM public.model_included_items AS mi
      WHERE mi.model_id = pm.id
        AND mi.active = true
    ), ARRAY[]::text[]) AS included_items,
    pm.not_included_items,
    pm.photo_url,
    pm.payment_terms,
    pm.notes,
    pm.created_at,
    pm.updated_at
  FROM public.pool_models AS pm
  WHERE pm.active = true
    AND (_store_id IS NULL OR pm.store_id = _store_id)
  ORDER BY pm.display_order;
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