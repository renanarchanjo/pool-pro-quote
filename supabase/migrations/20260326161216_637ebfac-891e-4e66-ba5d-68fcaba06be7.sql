
-- Remove anon access to base tables (views will provide column-restricted access)
DROP POLICY IF EXISTS "Anon can view basic store data" ON public.stores;
DROP POLICY IF EXISTS "Anon can view active pool models" ON public.pool_models;
DROP POLICY IF EXISTS "Anon can view active optionals" ON public.optionals;
DROP POLICY IF EXISTS "Anon can view active model optionals" ON public.model_optionals;
DROP POLICY IF EXISTS "Anon can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Anon can view active lead plans" ON public.lead_plans;

-- Recreate views without security_invoker (security_definer pattern)
-- These views intentionally bypass RLS to provide column-restricted public access
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public AS
  SELECT id, name, slug, city, state, latitude, longitude
  FROM public.stores;
GRANT SELECT ON public.stores_public TO anon, authenticated;

DROP VIEW IF EXISTS public.pool_models_public;
CREATE VIEW public.pool_models_public AS
  SELECT id, name, category_id, base_price, delivery_days, installation_days,
         active, store_id, length, width, depth, display_order, differentials,
         included_items, not_included_items, photo_url, payment_terms, notes,
         created_at, updated_at
  FROM public.pool_models
  WHERE active = true;
GRANT SELECT ON public.pool_models_public TO anon, authenticated;

DROP VIEW IF EXISTS public.optionals_public;
CREATE VIEW public.optionals_public AS
  SELECT id, name, description, price, group_id, store_id, display_order,
         active, warning_note, created_at, updated_at
  FROM public.optionals
  WHERE active = true;
GRANT SELECT ON public.optionals_public TO anon, authenticated;

DROP VIEW IF EXISTS public.model_optionals_public;
CREATE VIEW public.model_optionals_public AS
  SELECT id, model_id, store_id, price, active, display_order, name,
         description, created_at, updated_at
  FROM public.model_optionals
  WHERE active = true;
GRANT SELECT ON public.model_optionals_public TO anon, authenticated;

DROP VIEW IF EXISTS public.subscription_plans_public;
CREATE VIEW public.subscription_plans_public AS
  SELECT id, name, slug, price_monthly, max_proposals_per_month, max_users,
         display_order, active, created_at
  FROM public.subscription_plans
  WHERE active = true;
GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

DROP VIEW IF EXISTS public.lead_plans_public;
CREATE VIEW public.lead_plans_public AS
  SELECT id, name, price_monthly, lead_limit, excess_price,
         display_order, active, created_at, updated_at
  FROM public.lead_plans
  WHERE active = true;
GRANT SELECT ON public.lead_plans_public TO anon, authenticated;
