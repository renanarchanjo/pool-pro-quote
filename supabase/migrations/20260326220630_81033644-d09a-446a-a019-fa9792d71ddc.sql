
ALTER TABLE public.model_included_items ADD COLUMN quantity integer NOT NULL DEFAULT 1;
ALTER TABLE public.included_item_template_items ADD COLUMN quantity integer NOT NULL DEFAULT 1;
