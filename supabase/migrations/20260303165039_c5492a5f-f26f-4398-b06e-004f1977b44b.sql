
-- Create storage bucket for store logos
INSERT INTO storage.buckets (id, name, public) VALUES ('store-logos', 'store-logos', true);

-- Allow authenticated users to upload to their store's folder
CREATE POLICY "Users can upload store logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-logos');

-- Allow anyone to view store logos (public bucket)
CREATE POLICY "Anyone can view store logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Users can update store logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'store-logos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Users can delete store logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'store-logos');
