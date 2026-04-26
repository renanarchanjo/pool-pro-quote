-- ============================================================
-- Restrict proposals bucket storage policies
-- Date: 2026-04-26
--
-- Context: upload-proposal-pdf Edge Function uses service role
-- (bypasses RLS), so we can make storage policies restrictive.
-- Previously all operations were open to anon+authenticated.
-- ============================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "proposals_insert_all" ON storage.objects;
DROP POLICY IF EXISTS "proposals_update_all" ON storage.objects;
DROP POLICY IF EXISTS "proposals_delete_all" ON storage.objects;
DROP POLICY IF EXISTS "proposals_select_all" ON storage.objects;

-- SELECT: needed for signed URLs and direct PDF access
CREATE POLICY "proposals_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proposals');

-- No INSERT/UPDATE/DELETE policies for regular users.
-- The Edge Function uses service role key which bypasses RLS entirely.
-- This prevents any direct storage manipulation by end users.
