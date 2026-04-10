
-- Fix 1: Replace the overly permissive DELETE policy on proposals storage bucket
DROP POLICY IF EXISTS "Owner delete proposals" ON storage.objects;

CREATE POLICY "Owner delete proposals scoped"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'proposals'
  AND (
    (storage.foldername(name))[1] = get_user_store_id(auth.uid())::text
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Fix 2: Replace the owner UPDATE policy on stores to prevent billing field tampering
DROP POLICY IF EXISTS "Owners can update their store" ON public.stores;

CREATE POLICY "Owners can update their store safely"
ON public.stores
FOR UPDATE
TO authenticated
USING (
  id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
  -- Prevent owners from changing billing/subscription fields
  AND stripe_customer_id IS NOT DISTINCT FROM (SELECT s.stripe_customer_id FROM stores s WHERE s.id = id)
  AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT s.stripe_subscription_id FROM stores s WHERE s.id = id)
  AND plan_status IS NOT DISTINCT FROM (SELECT s.plan_status FROM stores s WHERE s.id = id)
  AND plan_expires_at IS NOT DISTINCT FROM (SELECT s.plan_expires_at FROM stores s WHERE s.id = id)
  AND plan_id IS NOT DISTINCT FROM (SELECT s.plan_id FROM stores s WHERE s.id = id)
  AND plan_started_at IS NOT DISTINCT FROM (SELECT s.plan_started_at FROM stores s WHERE s.id = id)
  AND lead_limit_monthly IS NOT DISTINCT FROM (SELECT s.lead_limit_monthly FROM stores s WHERE s.id = id)
  AND lead_price_excess IS NOT DISTINCT FROM (SELECT s.lead_price_excess FROM stores s WHERE s.id = id)
  AND lead_plan_active IS NOT DISTINCT FROM (SELECT s.lead_plan_active FROM stores s WHERE s.id = id)
);
