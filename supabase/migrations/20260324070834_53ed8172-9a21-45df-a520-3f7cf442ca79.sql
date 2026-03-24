
-- =============================================
-- 1. FIX: Remove anon public read on proposals
-- =============================================
DROP POLICY IF EXISTS "Public can view proposal after creation" ON proposals;

-- =============================================
-- 2. FIX: Cross-tenant leak - owners seeing all proposals
-- Replace with store-scoped policy
-- =============================================
DROP POLICY IF EXISTS "Owners can view their own store proposals" ON proposals;
DROP POLICY IF EXISTS "Owners can view all proposals" ON proposals;

CREATE POLICY "Owners can view their store proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- =============================================
-- 3. FIX: user_roles self-assignment escalation
-- Only allow inserting 'owner' role (during signup)
-- super_admin must be assigned via DB/admin
-- =============================================
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON user_roles;

CREATE POLICY "Users can insert own owner role during signup"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'::app_role
  );

-- =============================================
-- 4. FIX: Restrict proposal INSERT to valid stores
-- Consolidate duplicate insert policies
-- =============================================
DROP POLICY IF EXISTS "Public can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Anyone can create proposals" ON proposals;
DROP POLICY IF EXISTS "Public can insert proposals for simulation" ON proposals;

CREATE POLICY "Public can insert proposals for valid stores"
  ON proposals FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id)
    AND total_price > 0
  );

-- =============================================
-- 5. FIX: Restrict catalog management to owners only
-- Brands
-- =============================================
DROP POLICY IF EXISTS "Users can manage their store brands" ON brands;
DROP POLICY IF EXISTS "Users can delete their store brands" ON brands;

CREATE POLICY "Owners can manage their store brands"
  ON brands FOR ALL
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- Categories
DROP POLICY IF EXISTS "Users can manage their store categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their store categories" ON categories;

CREATE POLICY "Owners can manage their store categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- Pool Models
DROP POLICY IF EXISTS "Users can manage their store pool models" ON pool_models;
DROP POLICY IF EXISTS "Users can delete their store pool models" ON pool_models;

CREATE POLICY "Owners can manage their store pool models"
  ON pool_models FOR ALL
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- Optionals
DROP POLICY IF EXISTS "Users can manage their store optionals" ON optionals;
DROP POLICY IF EXISTS "Users can delete their store optionals" ON optionals;

CREATE POLICY "Owners can manage their store optionals"
  ON optionals FOR ALL
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- Optional Groups
DROP POLICY IF EXISTS "Users can manage their store optional groups" ON optional_groups;
DROP POLICY IF EXISTS "Users can delete their store optional groups" ON optional_groups;

CREATE POLICY "Owners can manage their store optional groups"
  ON optional_groups FOR ALL
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );

-- Model Optionals
DROP POLICY IF EXISTS "Users can manage their store model optionals" ON model_optionals;
DROP POLICY IF EXISTS "Users can delete their store model optionals" ON model_optionals;

CREATE POLICY "Owners can manage their store model optionals"
  ON model_optionals FOR ALL
  TO authenticated
  USING (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    store_id = get_user_store_id(auth.uid())
    AND has_role(auth.uid(), 'owner'::app_role)
  );
