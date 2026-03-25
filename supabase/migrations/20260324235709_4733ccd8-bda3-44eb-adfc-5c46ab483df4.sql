ALTER TABLE public.subscription_plans 
  ADD COLUMN stripe_price_id text,
  ADD COLUMN stripe_product_id text;

-- Populate with existing known values
UPDATE public.subscription_plans SET stripe_price_id = 'price_1TEdIiDLDBZHKYif22uYH0ns', stripe_product_id = 'prod_UD3PEYnNACZIPf' WHERE slug = 'premium';
UPDATE public.subscription_plans SET stripe_price_id = 'price_1TEdJ4DLDBZHKYif5sFUfHLO', stripe_product_id = 'prod_UD3PdH9NRCfw5t' WHERE slug = 'avancado';
UPDATE public.subscription_plans SET stripe_price_id = 'price_1TEdJRDLDBZHKYifIP8NhqDm', stripe_product_id = 'prod_UD3QKozvTgVova' WHERE slug = 'escala';