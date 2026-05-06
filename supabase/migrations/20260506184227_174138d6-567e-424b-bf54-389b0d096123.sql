CREATE OR REPLACE FUNCTION public.protect_locked_model_included_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.partner_locked = true THEN
    -- Preserve catalog ownership/linkage while allowing store-level proposal customization.
    NEW.model_id := OLD.model_id;
    NEW.partner_locked := OLD.partner_locked;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_pool_model_included_items(_model_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

SELECT public.sync_pool_model_included_items(pm.id)
FROM public.pool_models pm
WHERE EXISTS (
  SELECT 1
  FROM public.model_included_items mi
  WHERE mi.model_id = pm.id
);