-- Create stores table (each store represents a lojista)
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('owner', 'seller');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create store_settings table for customization
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#0ea5e9',
  secondary_color text DEFAULT '#06b6d4',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add store_id to existing tables
ALTER TABLE public.categories ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.pool_models ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.optionals ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.proposals ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Users can view their own store"
  ON public.stores FOR SELECT
  USING (id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Owners can update their store"
  ON public.stores FOR UPDATE
  USING (id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'owner'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for store_settings
CREATE POLICY "Users can view their store settings"
  ON public.store_settings FOR SELECT
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Owners can manage store settings"
  ON public.store_settings FOR ALL
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'owner'));

-- Update RLS policies for existing tables to respect store_id
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
CREATE POLICY "Users can manage their store categories"
  ON public.categories FOR ALL
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories by store"
  ON public.categories FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage pool models" ON public.pool_models;
CREATE POLICY "Users can manage their store pool models"
  ON public.pool_models FOR ALL
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active pool models" ON public.pool_models;
CREATE POLICY "Anyone can view active pool models by store"
  ON public.pool_models FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage optionals" ON public.optionals;
CREATE POLICY "Users can manage their store optionals"
  ON public.optionals FOR ALL
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active optionals" ON public.optionals;
CREATE POLICY "Anyone can view active optionals by store"
  ON public.optionals FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can view all proposals" ON public.proposals;
CREATE POLICY "Users can view their store proposals"
  ON public.proposals FOR SELECT
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();