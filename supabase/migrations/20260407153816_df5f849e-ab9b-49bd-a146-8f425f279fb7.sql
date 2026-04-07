-- FIX 1: Storage RLS - Restrict store-logos to store owners
DROP POLICY IF EXISTS "Users can upload store logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update store logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete store logos" ON storage.objects;

CREATE POLICY "Owners can upload their store logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-logos'
  AND has_role(auth.uid(), 'owner'::public.app_role)
  AND (storage.foldername(name))[1] = get_user_store_id(auth.uid())::text
);

CREATE POLICY "Owners can update their store logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND has_role(auth.uid(), 'owner'::public.app_role)
  AND (storage.foldername(name))[1] = get_user_store_id(auth.uid())::text
);

CREATE POLICY "Owners can delete their store logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND has_role(auth.uid(), 'owner'::public.app_role)
  AND (storage.foldername(name))[1] = get_user_store_id(auth.uid())::text
);

CREATE POLICY "Super admins can manage store logos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'store-logos'
  AND has_role(auth.uid(), 'super_admin'::public.app_role)
);