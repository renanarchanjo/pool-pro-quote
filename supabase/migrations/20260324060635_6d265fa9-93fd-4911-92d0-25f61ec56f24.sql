-- Update default value for lead_limit_monthly and existing stores
ALTER TABLE public.stores ALTER COLUMN lead_limit_monthly SET DEFAULT 100;
UPDATE public.stores SET lead_limit_monthly = 100 WHERE lead_limit_monthly = 40;