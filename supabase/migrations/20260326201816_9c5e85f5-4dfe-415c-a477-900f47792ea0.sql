
-- Add ranking to partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS ranking integer NOT NULL DEFAULT 10;

-- Create store_partners junction table
CREATE TABLE public.store_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, partner_id)
);

ALTER TABLE public.store_partners ENABLE ROW LEVEL SECURITY;

-- Owners can manage their store_partners
CREATE POLICY "Owners can manage store_partners"
ON public.store_partners FOR ALL TO authenticated
USING (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Users can view their store_partners
CREATE POLICY "Users can view store_partners"
ON public.store_partners FOR SELECT TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access store_partners"
ON public.store_partners FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
