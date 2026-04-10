
-- Add coverage radius fields to stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS coverage_radius_km INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS coverage_radius_active BOOLEAN NOT NULL DEFAULT true;

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.store_radius_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  old_radius_km INTEGER,
  new_radius_km INTEGER,
  old_active BOOLEAN,
  new_active BOOLEAN,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_radius_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_read_radius_log') THEN
    CREATE POLICY "super_admin_read_radius_log" ON public.store_radius_audit_log
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'super_admin_insert_radius_log') THEN
    CREATE POLICY "super_admin_insert_radius_log" ON public.store_radius_audit_log
      FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Drop and recreate get_stores_public with new fields
DROP FUNCTION IF EXISTS public.get_stores_public();

CREATE FUNCTION public.get_stores_public()
RETURNS TABLE(
  city text,
  id uuid,
  latitude numeric,
  longitude numeric,
  name text,
  slug text,
  state text,
  coverage_radius_km integer,
  coverage_radius_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.city, s.id, s.latitude, s.longitude, s.name, s.slug, s.state,
         s.coverage_radius_km, s.coverage_radius_active
  FROM public.stores s;
$$;
