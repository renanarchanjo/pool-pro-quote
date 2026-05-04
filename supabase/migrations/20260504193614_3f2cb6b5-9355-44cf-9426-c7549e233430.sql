ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS company_email text;