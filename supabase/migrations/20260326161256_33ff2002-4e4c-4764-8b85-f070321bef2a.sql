
-- Replace views with security_definer functions (proper column restriction)
DROP VIEW IF EXISTS public.stores_public;
DROP VIEW IF EXISTS public.pool_models_public;
DROP VIEW IF EXISTS public.optionals_public;
DROP VIEW IF EXISTS public.model_optionals_public;
DROP VIEW IF EXISTS public.subscription_plans_public;
DROP VIEW IF EXISTS public.lead_plans_public;

-- RPC: get_stores_public
CREATE OR REPLACE FUNCTION public.get_stores_public()
RETURNS TABLE(id uuid, name text, slug text, city text, state text, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, slug, city, state, latitude, longitude FROM stores;
$$;

-- RPC: get_stores_public_by_state
CREATE OR REPLACE FUNCTION public.get_stores_public_by_state(_state text)
RETURNS TABLE(id uuid, name text, slug text, city text, state text, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, slug, city, state, latitude, longitude FROM stores WHERE state = _state;
$$;

-- RPC: get_store_public_by_id
CREATE OR REPLACE FUNCTION public.get_store_public_by_id(_id uuid)
RETURNS TABLE(name text, city text, state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name, city, state FROM stores WHERE id = _id LIMIT 1;
$$;

-- RPC: get_pool_models_public
CREATE OR REPLACE FUNCTION public.get_pool_models_public(_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, name text, category_id uuid, base_price numeric, delivery_days integer,
  installation_days integer, active boolean, store_id uuid, length numeric, width numeric,
  depth numeric, display_order integer, differentials text[], included_items text[],
  not_included_items text[], photo_url text, payment_terms text, notes text,
  created_at timestamptz, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, category_id, base_price, delivery_days, installation_days, active,
         store_id, length, width, depth, display_order, differentials, included_items,
         not_included_items, photo_url, payment_terms, notes, created_at, updated_at
  FROM pool_models
  WHERE active = true AND (_store_id IS NULL OR pool_models.store_id = _store_id)
  ORDER BY display_order;
$$;

-- RPC: get_optionals_public
CREATE OR REPLACE FUNCTION public.get_optionals_public(_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, name text, description text, price numeric, group_id uuid, store_id uuid,
  display_order integer, active boolean, warning_note text, created_at timestamptz, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, description, price, group_id, store_id, display_order, active,
         warning_note, created_at, updated_at
  FROM optionals
  WHERE active = true AND (_store_id IS NULL OR optionals.store_id = _store_id)
  ORDER BY display_order;
$$;

-- RPC: get_model_optionals_public
CREATE OR REPLACE FUNCTION public.get_model_optionals_public(_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, model_id uuid, store_id uuid, price numeric, active boolean,
  display_order integer, name text, description text, created_at timestamptz, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, model_id, store_id, price, active, display_order, name, description,
         created_at, updated_at
  FROM model_optionals
  WHERE active = true AND (_store_id IS NULL OR model_optionals.store_id = _store_id)
  ORDER BY display_order;
$$;

-- RPC: get_subscription_plans_public
CREATE OR REPLACE FUNCTION public.get_subscription_plans_public()
RETURNS TABLE(
  id uuid, name text, slug text, price_monthly numeric, max_proposals_per_month integer,
  max_users integer, display_order integer, active boolean, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, slug, price_monthly, max_proposals_per_month, max_users,
         display_order, active, created_at
  FROM subscription_plans WHERE active = true ORDER BY display_order;
$$;

-- RPC: get_lead_plans_public
CREATE OR REPLACE FUNCTION public.get_lead_plans_public()
RETURNS TABLE(
  id uuid, name text, price_monthly numeric, lead_limit integer, excess_price numeric,
  display_order integer, active boolean, created_at timestamptz, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, price_monthly, lead_limit, excess_price,
         display_order, active, created_at, updated_at
  FROM lead_plans WHERE active = true ORDER BY display_order;
$$;
