-- Fix cross-tenant leak: drop overly permissive policy and create scoped one
DROP POLICY IF EXISTS "Owners can view all proposals" ON public.proposals;

CREATE POLICY "Owners can view their own store proposals"
  ON public.proposals FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.profiles WHERE id = auth.uid()
    )
    AND has_role(auth.uid(), 'owner'::app_role)
  );