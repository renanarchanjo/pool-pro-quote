
CREATE TABLE public.commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_percent numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (store_id, member_id)
);

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- Owners can manage commission settings for their store
CREATE POLICY "Owners can manage commission_settings"
ON public.commission_settings
FOR ALL
TO authenticated
USING (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (store_id = get_user_store_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Members can view their own commission settings
CREATE POLICY "Members can view own commission_settings"
ON public.commission_settings
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- Super admins full access
CREATE POLICY "Super admins full access commission_settings"
ON public.commission_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
