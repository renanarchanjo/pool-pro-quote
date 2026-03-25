
-- Allow super admins to view all lead plans (including inactive)
CREATE POLICY "Super admins can view all lead plans"
  ON public.lead_plans FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));
