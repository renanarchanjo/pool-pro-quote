CREATE TABLE public.model_optionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.pool_models(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  cost numeric DEFAULT 0,
  margin_percent numeric DEFAULT 0,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.model_optionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active model optionals"
  ON public.model_optionals FOR SELECT TO public
  USING (active = true);

CREATE POLICY "Users can manage their store model optionals"
  ON public.model_optionals FOR ALL TO public
  USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their store model optionals"
  ON public.model_optionals FOR DELETE TO authenticated
  USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));