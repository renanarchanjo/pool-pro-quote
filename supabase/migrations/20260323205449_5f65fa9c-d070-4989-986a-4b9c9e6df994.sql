
-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add brand_id to categories
ALTER TABLE public.categories ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- RLS policies for brands
CREATE POLICY "Anyone can view active brands" ON public.brands FOR SELECT TO public USING (active = true);
CREATE POLICY "Users can manage their store brands" ON public.brands FOR ALL TO public USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their store brands" ON public.brands FOR DELETE TO authenticated USING (store_id IN (SELECT profiles.store_id FROM profiles WHERE profiles.id = auth.uid()));
