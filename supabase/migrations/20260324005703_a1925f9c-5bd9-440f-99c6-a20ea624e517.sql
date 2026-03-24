
-- Allow super admins to delete proposals
CREATE POLICY "Super admins can delete proposals"
ON public.proposals
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete store_settings
CREATE POLICY "Super admins can delete store_settings"
ON public.store_settings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to manage store_settings fully
CREATE POLICY "Super admins can manage store_settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
