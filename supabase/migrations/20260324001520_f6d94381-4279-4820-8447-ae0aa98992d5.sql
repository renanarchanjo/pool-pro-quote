-- Partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active partners (public page)
CREATE POLICY "Anyone can view active partners"
ON public.partners FOR SELECT TO public
USING (active = true);

-- Super admins can manage partners
CREATE POLICY "Super admins can manage partners"
ON public.partners FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Storage bucket for partner logos
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for partner logos
CREATE POLICY "Anyone can view partner logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'partner-logos');

CREATE POLICY "Super admins can upload partner logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update partner logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete partner logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();