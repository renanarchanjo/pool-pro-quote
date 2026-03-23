-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_monthly numeric NOT NULL DEFAULT 0,
  max_proposals_per_month integer NOT NULL DEFAULT 10,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
TO public
USING (active = true);

CREATE POLICY "Super admins can manage plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert the 4 plans
INSERT INTO public.subscription_plans (name, slug, price_monthly, max_proposals_per_month, display_order) VALUES
  ('Gratuito', 'gratuito', 0, 10, 1),
  ('Premium', 'premium', 99.90, 100, 2),
  ('Avançado', 'avancado', 199.90, 500, 3),
  ('Escala', 'escala', 299.90, 1000, 4);

-- Add plan tracking to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'active';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_started_at timestamptz DEFAULT now();
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- Payment history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_id text,
  payment_date timestamptz DEFAULT now(),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all payments"
ON public.payment_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Store owners can view own payments"
ON public.payment_history FOR SELECT
TO authenticated
USING (store_id IN (
  SELECT p.store_id FROM public.profiles p WHERE p.id = auth.uid()
));

-- Super admin policies
CREATE POLICY "Super admins can view all stores"
ON public.stores FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all stores"
ON public.stores FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all proposals"
ON public.proposals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));