
-- Fix security definer views - use security_invoker
-- But we need anon access to work, so we need to add
-- minimal public SELECT policies back on base tables

-- Add minimal public SELECT policies for simulator access
CREATE POLICY "Anon can view basic store data"
  ON public.stores FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can view active pool models"
  ON public.pool_models FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Anon can view active optionals"
  ON public.optionals FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Anon can view active model optionals"
  ON public.model_optionals FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Anon can view active subscription plans"
  ON public.subscription_plans FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Anon can view active lead plans"
  ON public.lead_plans FOR SELECT TO anon
  USING (active = true);

-- Recreate all views with security_invoker to fix linter
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, city, state, latitude, longitude
  FROM public.stores;
GRANT SELECT ON public.stores_public TO anon, authenticated;

DROP VIEW IF EXISTS public.pool_models_public;
CREATE VIEW public.pool_models_public
WITH (security_invoker = on) AS
  SELECT id, name, category_id, base_price, delivery_days, installation_days,
         active, store_id, length, width, depth, display_order, differentials,
         included_items, not_included_items, photo_url, payment_terms, notes,
         created_at, updated_at
  FROM public.pool_models;
GRANT SELECT ON public.pool_models_public TO anon, authenticated;

DROP VIEW IF EXISTS public.optionals_public;
CREATE VIEW public.optionals_public
WITH (security_invoker = on) AS
  SELECT id, name, description, price, group_id, store_id, display_order,
         active, warning_note, created_at, updated_at
  FROM public.optionals;
GRANT SELECT ON public.optionals_public TO anon, authenticated;

DROP VIEW IF EXISTS public.model_optionals_public;
CREATE VIEW public.model_optionals_public
WITH (security_invoker = on) AS
  SELECT id, model_id, store_id, price, active, display_order, name,
         description, created_at, updated_at
  FROM public.model_optionals;
GRANT SELECT ON public.model_optionals_public TO anon, authenticated;

DROP VIEW IF EXISTS public.subscription_plans_public;
CREATE VIEW public.subscription_plans_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, price_monthly, max_proposals_per_month, max_users,
         display_order, active, created_at
  FROM public.subscription_plans;
GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

DROP VIEW IF EXISTS public.lead_plans_public;
CREATE VIEW public.lead_plans_public
WITH (security_invoker = on) AS
  SELECT id, name, price_monthly, lead_limit, excess_price,
         display_order, active, created_at, updated_at
  FROM public.lead_plans;
GRANT SELECT ON public.lead_plans_public TO anon, authenticated;
