CREATE POLICY "Owners can view all proposals"
ON public.proposals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));