
-- Allow super admins to delete stores
CREATE POLICY "Super admins can delete stores"
ON public.stores
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Also allow super admin to delete related profiles when deleting a store
CREATE POLICY "Super admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
