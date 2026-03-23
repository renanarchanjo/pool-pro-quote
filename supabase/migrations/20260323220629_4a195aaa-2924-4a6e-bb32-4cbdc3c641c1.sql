CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

DROP POLICY IF EXISTS "Store owners can view store profiles" ON public.profiles;
DROP POLICY IF EXISTS "Store owners can update store profiles" ON public.profiles;

CREATE POLICY "Store owners can view store profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_store_id(auth.uid()) = store_id
  AND public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Store owners can update store profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.get_user_store_id(auth.uid()) = store_id
  AND public.has_role(auth.uid(), 'owner')
);