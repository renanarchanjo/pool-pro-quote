-- Allow anonymous uploads to proposals bucket (for public simulator Flow 1)
CREATE POLICY "Anonymous upload proposals"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'proposals');