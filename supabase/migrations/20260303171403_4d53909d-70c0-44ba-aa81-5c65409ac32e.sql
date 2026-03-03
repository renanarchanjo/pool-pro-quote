
ALTER TABLE public.pool_models
  ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent numeric DEFAULT 0;

ALTER TABLE public.optionals
  ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent numeric DEFAULT 0;
