
-- ============================================================
-- PART A: partner_catalog_* template tables (super-admin managed)
-- ============================================================

CREATE TABLE public.partner_catalog_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcb_partner ON public.partner_catalog_brands(partner_id);

CREATE TABLE public.partner_catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_catalog_brand_id UUID NOT NULL REFERENCES public.partner_catalog_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcc_brand ON public.partner_catalog_categories(partner_catalog_brand_id);

CREATE TABLE public.partner_catalog_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_catalog_category_id UUID NOT NULL REFERENCES public.partner_catalog_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  length NUMERIC,
  width NUMERIC,
  depth NUMERIC,
  delivery_days INTEGER DEFAULT 30,
  installation_days INTEGER DEFAULT 5,
  payment_terms TEXT DEFAULT 'À vista',
  notes TEXT,
  photo_url TEXT,
  differentials TEXT[] DEFAULT '{}',
  included_items TEXT[] DEFAULT '{}',
  not_included_items TEXT[] DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcm_category ON public.partner_catalog_models(partner_catalog_category_id);

CREATE TABLE public.partner_catalog_model_optionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_catalog_model_id UUID NOT NULL REFERENCES public.partner_catalog_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  item_type TEXT NOT NULL DEFAULT 'material',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcmo_model ON public.partner_catalog_model_optionals(partner_catalog_model_id);

CREATE TABLE public.partner_catalog_model_included_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_catalog_model_id UUID NOT NULL REFERENCES public.partner_catalog_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_type TEXT NOT NULL DEFAULT 'material',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcmi_model ON public.partner_catalog_model_included_items(partner_catalog_model_id);

CREATE TABLE public.partner_catalog_optional_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  selection_type TEXT NOT NULL DEFAULT 'multiple',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcog_partner ON public.partner_catalog_optional_groups(partner_id);

CREATE TABLE public.partner_catalog_optionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_catalog_optional_group_id UUID NOT NULL REFERENCES public.partner_catalog_optional_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  warning_note TEXT,
  item_type TEXT NOT NULL DEFAULT 'material',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pco_group ON public.partner_catalog_optionals(partner_catalog_optional_group_id);

CREATE TABLE public.partner_catalog_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  name TEXT NOT NULL,
  not_included_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcit_partner ON public.partner_catalog_item_templates(partner_id);

CREATE TABLE public.partner_catalog_item_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_catalog_item_template_id UUID NOT NULL REFERENCES public.partner_catalog_item_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_type TEXT NOT NULL DEFAULT 'material',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pciti_template ON public.partner_catalog_item_template_items(partner_catalog_item_template_id);

-- ============================================================
-- RLS for partner_catalog_*
-- ============================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'partner_catalog_brands','partner_catalog_categories','partner_catalog_models',
    'partner_catalog_model_optionals','partner_catalog_model_included_items',
    'partner_catalog_optional_groups','partner_catalog_optionals',
    'partner_catalog_item_templates','partner_catalog_item_template_items'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Authenticated can view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Super admins manage %1$s" ON public.%1$s FOR ALL TO authenticated USING (has_role(auth.uid(),''super_admin''::app_role)) WITH CHECK (has_role(auth.uid(),''super_admin''::app_role))', t);
  END LOOP;
END $$;

-- ============================================================
-- PART B: partner_locked columns on existing store tables
-- ============================================================

ALTER TABLE public.brands ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.pool_models ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.pool_models ADD COLUMN partner_locked_source UUID;
ALTER TABLE public.model_optionals ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.model_included_items ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.optional_groups ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.optionals ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.included_item_templates ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.included_item_template_items ADD COLUMN partner_locked BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- PART C: protection triggers for locked rows
-- Lojista (owner) can only change price-like fields when partner_locked=true.
-- Super-admin has full access.
-- ============================================================

-- Generic protection: block change of any column when locked, unless caller is super_admin.
CREATE OR REPLACE FUNCTION public.protect_locked_brands()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.description := OLD.description;
    NEW.logo_url := OLD.logo_url;
    NEW.partner_id := OLD.partner_id;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_protect_locked_brands BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_brands();

CREATE OR REPLACE FUNCTION public.protect_locked_categories()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.description := OLD.description;
    NEW.brand_id := OLD.brand_id;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_categories BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_categories();

CREATE OR REPLACE FUNCTION public.protect_locked_pool_models()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    -- Only price-related editable: base_price, cost, margin_percent
    NEW.name := OLD.name;
    NEW.category_id := OLD.category_id;
    NEW.length := OLD.length;
    NEW.width := OLD.width;
    NEW.depth := OLD.depth;
    NEW.photo_url := OLD.photo_url;
    NEW.differentials := OLD.differentials;
    NEW.included_items := OLD.included_items;
    NEW.not_included_items := OLD.not_included_items;
    NEW.delivery_days := OLD.delivery_days;
    NEW.installation_days := OLD.installation_days;
    NEW.payment_terms := OLD.payment_terms;
    NEW.notes := OLD.notes;
    NEW.partner_locked := OLD.partner_locked;
    NEW.partner_locked_source := OLD.partner_locked_source;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_pool_models BEFORE UPDATE ON public.pool_models
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_pool_models();

CREATE OR REPLACE FUNCTION public.protect_locked_model_optionals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.description := OLD.description;
    NEW.model_id := OLD.model_id;
    NEW.item_type := OLD.item_type;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_model_optionals BEFORE UPDATE ON public.model_optionals
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_model_optionals();

CREATE OR REPLACE FUNCTION public.protect_locked_model_included_items()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.model_id := OLD.model_id;
    NEW.quantity := OLD.quantity;
    NEW.item_type := OLD.item_type;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_model_included_items BEFORE UPDATE ON public.model_included_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_model_included_items();

CREATE OR REPLACE FUNCTION public.protect_locked_optional_groups()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.description := OLD.description;
    NEW.selection_type := OLD.selection_type;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_optional_groups BEFORE UPDATE ON public.optional_groups
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_optional_groups();

CREATE OR REPLACE FUNCTION public.protect_locked_optionals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.description := OLD.description;
    NEW.group_id := OLD.group_id;
    NEW.warning_note := OLD.warning_note;
    NEW.item_type := OLD.item_type;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_optionals BEFORE UPDATE ON public.optionals
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_optionals();

CREATE OR REPLACE FUNCTION public.protect_locked_included_item_templates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.not_included_items := OLD.not_included_items;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_included_item_templates BEFORE UPDATE ON public.included_item_templates
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_included_item_templates();

CREATE OR REPLACE FUNCTION public.protect_locked_included_item_template_items()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(),'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF OLD.partner_locked = true THEN
    NEW.name := OLD.name;
    NEW.template_id := OLD.template_id;
    NEW.quantity := OLD.quantity;
    NEW.item_type := OLD.item_type;
    NEW.partner_locked := OLD.partner_locked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_locked_included_item_template_items BEFORE UPDATE ON public.included_item_template_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_included_item_template_items();

-- ============================================================
-- PART D: helper to check if a partner has a default catalog
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_has_catalog(_partner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM partner_catalog_brands WHERE partner_id = _partner_id);
$$;
