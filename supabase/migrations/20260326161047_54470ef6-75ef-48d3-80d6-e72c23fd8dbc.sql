
-- Fix: Add authenticated SELECT policies for tables that need it
-- The views use security_invoker, so callers need base table access

-- subscription_plans: authenticated users can view active plans
CREATE POLICY "Authenticated can view active subscription plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (active = true);

-- lead_plans: authenticated users can view active plans
CREATE POLICY "Authenticated can view active lead plans"
  ON public.lead_plans FOR SELECT TO authenticated
  USING (active = true);

-- stores: authenticated users need full access to their own store
-- (already have "Users can view their own store" and "Super admins can view all stores")
-- But anon users need the view for simulator - recreate views as security_definer
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
  FROM public.pool_models;
GRANT SELECT ON public.pool_models_public TO anon, authenticated;

DROP VIEW IF EXISTS public.optionals_public;
CREATE VIEW public.optionals_public AS
  SELECT id, name, description, price, group_id, store_id, display_order,
         active, warning_note, created_at, updated_at
  FROM public.optionals;
GRANT SELECT ON public.optionals_public TO anon, authenticated;

DROP VIEW IF EXISTS public.model_optionals_public;
CREATE VIEW public.model_optionals_public AS
  SELECT id, model_id, store_id, price, active, display_order, name,
         description, created_at, updated_at
  FROM public.model_optionals;
GRANT SELECT ON public.model_optionals_public TO anon, authenticated;

DROP VIEW IF EXISTS public.subscription_plans_public;
CREATE VIEW public.subscription_plans_public AS
  SELECT id, name, slug, price_monthly, max_proposals_per_month, max_users,
         display_order, active, created_at
  FROM public.subscription_plans;
GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

DROP VIEW IF EXISTS public.lead_plans_public;
CREATE VIEW public.lead_plans_public AS
  SELECT id, name, price_monthly, lead_limit, excess_price,
         display_order, active, created_at, updated_at
  FROM public.lead_plans;
GRANT SELECT ON public.lead_plans_public TO anon, authenticated;
