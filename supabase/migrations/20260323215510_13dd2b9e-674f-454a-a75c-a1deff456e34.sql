-- Allow store owners to view profiles of their store members
CREATE POLICY "Store owners can view store profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT p.store_id FROM profiles p WHERE p.id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'owner')
  );

-- Allow store owners to update store profiles (for removing members)
CREATE POLICY "Store owners can update store profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT p.store_id FROM profiles p WHERE p.id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'owner')
  );
