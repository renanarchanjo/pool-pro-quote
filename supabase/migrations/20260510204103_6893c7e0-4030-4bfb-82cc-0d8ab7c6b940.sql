ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS offers_alvenaria boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_vinil boolean NOT NULL DEFAULT false;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'fibra',
  ADD COLUMN IF NOT EXISTS quiz_data jsonb;

DROP FUNCTION IF EXISTS public.get_store_public_by_slug(text);
CREATE OR REPLACE FUNCTION public.get_store_public_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, city text, state text, whatsapp text, offers_alvenaria boolean, offers_vinil boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, slug, city, state, whatsapp, offers_alvenaria, offers_vinil
  FROM stores
  WHERE slug = _slug AND plan_status = 'active'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.validate_proposal_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  model_price DECIMAL;
BEGIN
  IF NEW.lead_type IN ('alvenaria','vinil','construcao') THEN
    RETURN NEW;
  END IF;

  IF NEW.model_id IS NOT NULL THEN
    SELECT base_price INTO model_price
    FROM pool_models
    WHERE id = NEW.model_id AND active = true;

    IF model_price IS NULL THEN
      RAISE EXCEPTION 'Modelo inválido ou inativo';
    END IF;

    IF NEW.total_price < model_price * 0.5 THEN
      RAISE EXCEPTION 'Preço inválido: muito abaixo do valor base do modelo';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;