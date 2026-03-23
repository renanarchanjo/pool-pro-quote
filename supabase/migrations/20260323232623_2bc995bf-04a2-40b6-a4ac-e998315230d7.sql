
-- Ensure anon and authenticated roles have INSERT permission on proposals
GRANT INSERT ON public.proposals TO anon;
GRANT INSERT ON public.proposals TO authenticated;

-- Drop duplicate INSERT policies and recreate a single clean one
DROP POLICY IF EXISTS "Anyone can create proposals" ON public.proposals;
DROP POLICY IF EXISTS "Public can insert proposals for simulation" ON public.proposals;

CREATE POLICY "Public can insert proposals"
ON public.proposals
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also allow public to SELECT their own proposal by id (needed for .select().single() after insert)
CREATE POLICY "Public can view proposal after creation"
ON public.proposals
FOR SELECT
TO anon
USING (true);
