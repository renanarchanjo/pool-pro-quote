
CREATE TABLE public.partner_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view partner categories"
  ON public.partner_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admins can manage partner categories"
  ON public.partner_categories
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
