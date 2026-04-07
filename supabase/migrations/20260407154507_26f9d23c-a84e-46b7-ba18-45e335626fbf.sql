-- FIX 1: Restrict stores SELECT policies to authenticated only
DROP POLICY IF EXISTS "Users can view their own store" ON public.stores;
CREATE POLICY "Users can view their own store"
ON public.stores FOR SELECT
TO authenticated
USING (id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Owners can update their store" ON public.stores;
CREATE POLICY "Owners can update their store"
ON public.stores FOR UPDATE
TO authenticated
USING (
  id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);

-- FIX 2: Add missing SELECT for store members on templates
CREATE POLICY "Store members can view included_item_templates"
ON public.included_item_templates FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Store members can view included_item_template_items"
ON public.included_item_template_items FOR SELECT
TO authenticated
USING (store_id = get_user_store_id(auth.uid()));