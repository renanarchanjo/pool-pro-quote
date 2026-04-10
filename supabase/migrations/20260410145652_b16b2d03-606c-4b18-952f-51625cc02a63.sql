
-- Create a security definer function to check if protected fields changed
CREATE OR REPLACE FUNCTION public.check_store_protected_fields_unchanged(
  _store_id uuid,
  _stripe_customer_id text,
  _stripe_subscription_id text,
  _plan_status text,
  _plan_expires_at timestamptz,
  _plan_id uuid,
  _plan_started_at timestamptz,
  _lead_limit_monthly integer,
  _lead_price_excess numeric,
  _lead_plan_active boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = _store_id
      AND s.stripe_customer_id IS NOT DISTINCT FROM _stripe_customer_id
      AND s.stripe_subscription_id IS NOT DISTINCT FROM _stripe_subscription_id
      AND s.plan_status IS NOT DISTINCT FROM _plan_status
      AND s.plan_expires_at IS NOT DISTINCT FROM _plan_expires_at
      AND s.plan_id IS NOT DISTINCT FROM _plan_id
      AND s.plan_started_at IS NOT DISTINCT FROM _plan_started_at
      AND s.lead_limit_monthly IS NOT DISTINCT FROM _lead_limit_monthly
      AND s.lead_price_excess IS NOT DISTINCT FROM _lead_price_excess
      AND s.lead_plan_active IS NOT DISTINCT FROM _lead_plan_active
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Owners can update their store safely" ON public.stores;

-- Recreate without self-referencing subqueries
CREATE POLICY "Owners can update their store safely"
ON public.stores
FOR UPDATE
USING (
  id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
  AND public.check_store_protected_fields_unchanged(
    id, stripe_customer_id, stripe_subscription_id,
    plan_status, plan_expires_at, plan_id, plan_started_at,
    lead_limit_monthly, lead_price_excess, lead_plan_active
  )
);
