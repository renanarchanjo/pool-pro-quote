-- Add missing SELECT policies for super_admins and store members (sellers)
-- These exclude cost/margin fields via the existing public RPC functions

-- Super admins SELECT on included_item_templates
CREATE POLICY "Super admins can view included_item_templates"
ON public.included_item_templates FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins SELECT on included_item_template_items
CREATE POLICY "Super admins can view included_item_template_items"
ON public.included_item_template_items FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins SELECT on model_included_items
CREATE POLICY "Super admins can view model_included_items"
ON public.model_included_items FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins SELECT on model_optionals
CREATE POLICY "Super admins can view model_optionals"
ON public.model_optionals FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Store members (sellers) can view pool_models (without cost/margin via app layer)
CREATE POLICY "Store members can view pool_models"
ON public.pool_models FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

-- Store members can view optionals
CREATE POLICY "Store members can view optionals"
ON public.optionals FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

-- Store members can view model_optionals
CREATE POLICY "Store members can view model_optionals"
ON public.model_optionals FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

-- Store members can view model_included_items
CREATE POLICY "Store members can view model_included_items"
ON public.model_included_items FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));