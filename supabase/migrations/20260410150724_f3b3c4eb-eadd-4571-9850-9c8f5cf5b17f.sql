
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects', 
      pol.policyname
    );
  END LOOP;
END $$;

UPDATE storage.buckets 
SET public = true 
WHERE id = 'proposals';

CREATE POLICY "proposals_insert_all"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'proposals');

CREATE POLICY "proposals_select_all"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'proposals');

CREATE POLICY "proposals_delete_all"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'proposals');
