-- Add item_type column to model_included_items
ALTER TABLE public.model_included_items
ADD COLUMN item_type text NOT NULL DEFAULT 'material';

-- Add item_type column to model_optionals
ALTER TABLE public.model_optionals
ADD COLUMN item_type text NOT NULL DEFAULT 'material';

-- Add item_type column to optionals
ALTER TABLE public.optionals
ADD COLUMN item_type text NOT NULL DEFAULT 'material';

-- Add item_type column to included_item_template_items
ALTER TABLE public.included_item_template_items
ADD COLUMN item_type text NOT NULL DEFAULT 'material';