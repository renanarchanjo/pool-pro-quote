-- FIX 1: Restrict stores INSERT to prevent setting sensitive fields
DROP POLICY IF EXISTS "Authenticated users can create stores during signup" ON public.stores;
CREATE POLICY "Authenticated users can create stores during signup"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.store_id IS NOT NULL)
  AND stripe_customer_id IS NULL
  AND stripe_subscription_id IS NULL
);

-- FIX 2: Restrict proposals INSERT - created_by must be null (anon) or match auth.uid()
DROP POLICY IF EXISTS "Public can insert proposals for valid stores" ON public.proposals;
CREATE POLICY "Public can insert proposals for valid stores"
ON public.proposals FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_exists(store_id)
  AND total_price > 0
  AND (created_by IS NULL OR created_by = auth.uid())
);

-- FIX 3: Restrict store_settings policies to authenticated only
DROP POLICY IF EXISTS "Owners can manage store settings" ON public.store_settings;
CREATE POLICY "Owners can manage store settings"
ON public.store_settings FOR ALL
TO authenticated
USING (
  store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);

DROP POLICY IF EXISTS "Users can view their store settings" ON public.store_settings;
CREATE POLICY "Users can view their store settings"
ON public.store_settings FOR SELECT
TO authenticated
USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));