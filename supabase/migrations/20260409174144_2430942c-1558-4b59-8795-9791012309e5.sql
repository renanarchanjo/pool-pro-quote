CREATE OR REPLACE FUNCTION public.get_model_included_items_total(_model_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(price), 0)
  FROM public.model_included_items
  WHERE model_id = _model_id
    AND active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_model_included_items_total(uuid) TO anon, authenticated;