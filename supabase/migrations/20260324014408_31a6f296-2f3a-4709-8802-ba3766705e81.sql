
-- Lead distributions table
CREATE TABLE public.lead_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  distributed_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, store_id)
);

ALTER TABLE public.lead_distributions ENABLE ROW LEVEL SECURITY;

-- Lead logs table
CREATE TABLE public.lead_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_logs ENABLE ROW LEVEL SECURITY;

-- Add lead management columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS lead_limit_monthly integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS lead_price_excess numeric DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS lead_plan_active boolean DEFAULT false;

-- RLS: lead_distributions
CREATE POLICY "Super admins full access on lead_distributions"
  ON public.lead_distributions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Stores can view their lead_distributions"
  ON public.lead_distributions FOR SELECT TO authenticated
  USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Stores can update their lead_distributions"
  ON public.lead_distributions FOR UPDATE TO authenticated
  USING (store_id = get_user_store_id(auth.uid()));

-- RLS: lead_logs
CREATE POLICY "Super admins full access on lead_logs"
  ON public.lead_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Stores can view their lead_logs"
  ON public.lead_logs FOR SELECT TO authenticated
  USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Stores can insert their lead_logs"
  ON public.lead_logs FOR INSERT TO authenticated
  WITH CHECK (store_id = get_user_store_id(auth.uid()));

-- Realtime for distributions
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_distributions;
