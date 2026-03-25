
-- Create lead_plans table
CREATE TABLE public.lead_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  lead_limit integer NOT NULL DEFAULT 100,
  excess_price numeric NOT NULL DEFAULT 25.00,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active lead plans
CREATE POLICY "Anyone can view active lead plans"
  ON public.lead_plans FOR SELECT TO public
  USING (active = true);

-- Super admins can manage lead plans
CREATE POLICY "Super admins can manage lead plans"
  ON public.lead_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Seed 4 plans
INSERT INTO public.lead_plans (name, price_monthly, lead_limit, excess_price, active, display_order) VALUES
  ('Plano Leads 1', 997.00, 100, 25.00, true, 1),
  ('Plano Leads 2', 1497.00, 150, 19.90, true, 2),
  ('Plano Leads 3', 1997.00, 200, 14.90, true, 3),
  ('Plano Leads 4', 2497.00, 250, 9.90, true, 4);
