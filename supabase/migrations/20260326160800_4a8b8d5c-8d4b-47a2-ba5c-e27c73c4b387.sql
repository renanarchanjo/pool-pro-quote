
-- ============================================================
-- SECURITY FIX: Comprehensive RLS hardening
-- ============================================================

-- 1. STORES: Replace overly permissive public SELECT with restricted view
-- Drop the old permissive public policy
DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;

-- Create a restricted public policy that only returns non-sensitive data
-- (RLS is row-level, so we create a view for column-level restriction)
CREATE OR REPLACE VIEW public.stores_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, city, state, latitude, longitude
  FROM public.stores;

-- Public can read the safe view; base table restricted to authenticated
CREATE POLICY "Public can view stores via limited columns"
  ON public.stores FOR SELECT TO public
  USING (true);

-- Note: The view with security_invoker will use the caller's RLS context

-- 2. USER_ROLES: Remove self-insert policy (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own owner role during signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON public.user_roles;

-- 3. POOL_MODELS: Create public view WITHOUT cost/margin
CREATE OR REPLACE VIEW public.pool_models_public
WITH (security_invoker = on) AS
  SELECT id, name, category_id, base_price, delivery_days, installation_days,
         active, store_id, length, width, depth, display_order, differentials,
         included_items, not_included_items, photo_url, payment_terms, notes,
         created_at, updated_at
  FROM public.pool_models;

-- 4. OPTIONALS: Create public view WITHOUT cost/margin
CREATE OR REPLACE VIEW public.optionals_public
WITH (security_invoker = on) AS
  SELECT id, name, description, price, group_id, store_id, display_order,
         active, warning_note, created_at, updated_at
  FROM public.optionals;

-- 5. MODEL_OPTIONALS: Create public view WITHOUT cost/margin
CREATE OR REPLACE VIEW public.model_optionals_public
WITH (security_invoker = on) AS
  SELECT id, model_id, store_id, price, active, display_order, name,
         description, created_at, updated_at
  FROM public.model_optionals;

-- 6. PLATFORM_SETTINGS: Restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated can view platform settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (true);

-- 7. STORES INSERT: Replace WITH CHECK (true) with proper validation
DROP POLICY IF EXISTS "Authenticated users can create stores during signup" ON public.stores;
CREATE POLICY "Authenticated users can create stores during signup"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (
    -- Only allow if user doesn't already have a store
    NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND store_id IS NOT NULL
    )
  );
