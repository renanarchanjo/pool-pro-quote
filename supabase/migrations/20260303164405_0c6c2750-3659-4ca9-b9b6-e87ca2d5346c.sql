
-- Allow store owners to delete their own categories
CREATE POLICY "Users can delete their store categories"
ON public.categories FOR DELETE TO authenticated
USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));

-- Allow store owners to delete their own optional groups
CREATE POLICY "Users can delete their store optional groups"
ON public.optional_groups FOR DELETE TO authenticated
USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));

-- Allow store owners to delete their own optionals
CREATE POLICY "Users can delete their store optionals"
ON public.optionals FOR DELETE TO authenticated
USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));

-- Allow store owners to delete their own pool models
CREATE POLICY "Users can delete their store pool models"
ON public.pool_models FOR DELETE TO authenticated
USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));
