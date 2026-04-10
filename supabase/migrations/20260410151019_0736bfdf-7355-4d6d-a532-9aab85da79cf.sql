
CREATE POLICY "proposals_update_all"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'proposals');
