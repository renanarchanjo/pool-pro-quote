-- CRITICAL FIX: Prevent users from changing their own store_id (privilege escalation)
-- Drop the overly permissive public update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with store_id immutability check
CREATE POLICY "Users can update their own profile safely"
ON public.profiles FOR UPDATE
TO public
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND store_id IS NOT DISTINCT FROM (SELECT p.store_id FROM public.profiles p WHERE p.id = auth.uid())
);