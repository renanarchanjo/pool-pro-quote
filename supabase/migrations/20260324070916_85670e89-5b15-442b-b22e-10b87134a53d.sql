
-- Fix: Restrict store creation to authenticated users only
DROP POLICY IF EXISTS "Users can create stores during signup" ON stores;

CREATE POLICY "Authenticated users can create stores during signup"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (true);
