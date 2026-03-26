
-- Template header
CREATE TABLE public.included_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.included_item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their included item templates"
ON public.included_item_templates FOR ALL TO authenticated
USING (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Template items
CREATE TABLE public.included_item_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.included_item_templates(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.included_item_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their template items"
ON public.included_item_template_items FOR ALL TO authenticated
USING (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));
