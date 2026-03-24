
-- Fix: The "Users can view their store proposals" policy uses Roles: {public} 
-- which doesn't cover authenticated users properly for the RETURNING clause.
-- Drop and recreate with correct role.

DROP POLICY IF EXISTS "Users can view their store proposals" ON public.proposals;

CREATE POLICY "Users can view their store proposals"
ON public.proposals
FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT profiles.store_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);
