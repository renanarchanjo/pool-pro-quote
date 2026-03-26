
-- ============================================================
-- SECURITY FIX ROUND 2: Remove public policies from base tables
-- ============================================================

-- 1. STORES: Drop overly permissive policy, keep only authenticated + view access
DROP POLICY IF EXISTS "Public can view stores via limited columns" ON public.stores;
-- Grant public read via the stores_public view only (no base table public policy)

-- 2. POOL_MODELS: Remove public SELECT from base table
DROP POLICY IF EXISTS "Anyone can view active pool models by store" ON public.pool_models;

-- 3. OPTIONALS: Remove public SELECT from base table
DROP POLICY IF EXISTS "Anyone can view active optionals by store" ON public.optionals;

-- 4. MODEL_OPTIONALS: Remove public SELECT from base table
DROP POLICY IF EXISTS "Anyone can view active model optionals" ON public.model_optionals;

-- 5. USER_ROLES: Explicitly add restrictive policies
-- RLS is enabled but we need explicit deny for INSERT/UPDATE/DELETE for non-admins
-- The default-deny only works if no permissive policy matches
-- Add a super_admin-only policy for managing roles
CREATE POLICY "Only super admins can manage user_roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 6. SUBSCRIPTION_PLANS: Create view without Stripe IDs
CREATE OR REPLACE VIEW public.subscription_plans_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, price_monthly, max_proposals_per_month, max_users,
         display_order, active, created_at
  FROM public.subscription_plans;

-- Remove public policy from base table
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;

-- 7. LEAD_PLANS: Create view without Stripe IDs
CREATE OR REPLACE VIEW public.lead_plans_public
WITH (security_invoker = on) AS
  SELECT id, name, price_monthly, lead_limit, excess_price,
         display_order, active, created_at, updated_at
  FROM public.lead_plans;

-- Remove public policy from base table
DROP POLICY IF EXISTS "Anyone can view active lead plans" ON public.lead_plans;

-- 8. Grant SELECT on all public views to anon and authenticated roles
GRANT SELECT ON public.stores_public TO anon, authenticated;
GRANT SELECT ON public.pool_models_public TO anon, authenticated;
GRANT SELECT ON public.optionals_public TO anon, authenticated;
GRANT SELECT ON public.model_optionals_public TO anon, authenticated;
GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;
GRANT SELECT ON public.lead_plans_public TO anon, authenticated;
