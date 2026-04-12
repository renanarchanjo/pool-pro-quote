-- Remove existing permissive policies on the proposals bucket
DROP POLICY IF EXISTS "proposals_insert_all" ON storage.objects;
DROP POLICY IF EXISTS "proposals_select_all" ON storage.objects;
DROP POLICY IF EXISTS "proposals_delete_all" ON storage.objects;
DROP POLICY IF EXISTS "proposals_update_all" ON storage.objects;

-- SELECT: public read (anon + authenticated)
CREATE POLICY "proposals_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposals');

-- INSERT: authenticated only
CREATE POLICY "proposals_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposals');

-- UPDATE: authenticated only
CREATE POLICY "proposals_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proposals');

-- DELETE: authenticated users whose store_id matches the file path prefix, or super_admin
CREATE POLICY "proposals_delete_restricted"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'proposals'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (storage.foldername(name))[1] = (public.get_user_store_id(auth.uid()))::text
  )
);