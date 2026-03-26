
-- Create a security definer function to check if a store exists
CREATE OR REPLACE FUNCTION public.store_exists(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM stores WHERE id = _store_id)
$$;

-- Drop the old insert policy and recreate using the security definer function
DROP POLICY IF EXISTS "Public can insert proposals for valid stores" ON public.proposals;

CREATE POLICY "Public can insert proposals for valid stores"
ON public.proposals
FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_exists(store_id) AND total_price > 0
);
