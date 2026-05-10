-- Disable partner-locked protections so store owners can fully edit partner catalog content
CREATE OR REPLACE FUNCTION public.protect_locked_pool_models()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_optionals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_model_included_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_model_optionals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_optional_groups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_brands()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_included_item_templates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.protect_locked_included_item_template_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN RETURN NEW; END $$;