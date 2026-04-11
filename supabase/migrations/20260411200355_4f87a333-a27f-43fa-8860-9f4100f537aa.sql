
-- Allow sellers to update proposals in their store (status changes)
CREATE POLICY "Sellers can update own store proposals"
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  store_id = get_user_store_id(auth.uid())
  AND has_role(auth.uid(), 'seller'::app_role)
)
WITH CHECK (
  store_id = get_user_store_id(auth.uid())
  AND has_role(auth.uid(), 'seller'::app_role)
);
