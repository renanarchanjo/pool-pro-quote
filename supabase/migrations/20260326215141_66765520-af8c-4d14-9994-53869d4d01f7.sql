
CREATE TABLE public.model_included_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.pool_models(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.model_included_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their store model included items"
ON public.model_included_items FOR ALL TO authenticated
USING (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));
