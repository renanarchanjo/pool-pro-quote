
-- 1. FIX PRIVILEGE ESCALATION: Remove self-insert owner role policy
DROP POLICY IF EXISTS "Users can insert own owner role during signup" ON public.user_roles;

-- 2. RESTRICT STORES: Hide sensitive columns (stripe, cnpj, etc.) from anonymous users
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (id, name, slug, city, state, latitude, longitude, created_at) ON public.stores TO anon;

-- 3. RESTRICT OPTIONALS: Hide cost/margin from anonymous users
REVOKE SELECT ON public.optionals FROM anon;
GRANT SELECT (id, name, description, price, group_id, store_id, display_order, active, warning_note, created_at, updated_at) ON public.optionals TO anon;

-- 4. RESTRICT POOL_MODELS: Hide cost/margin from anonymous users
REVOKE SELECT ON public.pool_models FROM anon;
GRANT SELECT (id, name, category_id, base_price, delivery_days, installation_days, active, store_id, length, width, depth, display_order, differentials, included_items, not_included_items, photo_url, payment_terms, notes, created_at, updated_at) ON public.pool_models TO anon;

-- 5. RESTRICT MODEL_OPTIONALS: Hide cost/margin from anonymous users
REVOKE SELECT ON public.model_optionals FROM anon;
GRANT SELECT (id, model_id, store_id, price, active, display_order, name, description, created_at, updated_at) ON public.model_optionals TO anon;
