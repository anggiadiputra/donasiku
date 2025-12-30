-- FINAL PERMANENT FIX FOR RLS & RECURSION (IDEMPOTENT VERSION)
-- This script can be run multiple times safely

-- 1. Helper Functions (SECURITY DEFINER to bypass RLS loops)
CREATE OR REPLACE FUNCTION public.get_auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_auth_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$;

-- 2. DROP all existing policies (IF EXISTS)
DROP POLICY IF EXISTS "app_settings_s_admin" ON app_settings;
DROP POLICY IF EXISTS "app_settings_s_public" ON app_settings;
DROP POLICY IF EXISTS "app_settings_public_select" ON app_settings;
DROP POLICY IF EXISTS "org_members_s_self" ON organization_members;
DROP POLICY IF EXISTS "org_members_all_admins" ON organization_members;
DROP POLICY IF EXISTS "org_members_manage_admins" ON organization_members;
DROP POLICY IF EXISTS "org_members_manage" ON organization_members;
DROP POLICY IF EXISTS "org_members_select" ON organization_members;
DROP POLICY IF EXISTS "organizations_u_members" ON organizations;
DROP POLICY IF EXISTS "organizations_s_public" ON organizations;
DROP POLICY IF EXISTS "organizations_public_select" ON organizations;
DROP POLICY IF EXISTS "organizations_admin_update" ON organizations;
DROP POLICY IF EXISTS "campaigns_s_hybrid" ON campaigns;
DROP POLICY IF EXISTS "campaigns_i_hybrid" ON campaigns;
DROP POLICY IF EXISTS "campaigns_u_hybrid" ON campaigns;
DROP POLICY IF EXISTS "campaigns_d_hybrid" ON campaigns;
DROP POLICY IF EXISTS "campaigns_select" ON campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON campaigns;
DROP POLICY IF EXISTS "campaigns_update" ON campaigns;
DROP POLICY IF EXISTS "transactions_s_org_hybrid" ON transactions;
DROP POLICY IF EXISTS "transactions_select_hybrid" ON transactions;

-- 3. Ensure RLS is enabled
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. CREATE FIXED POLICIES

-- APP SETTINGS (Public select for config)
CREATE POLICY "app_settings_public_select" ON app_settings FOR SELECT TO public USING (true);

-- ORGANIZATIONS
CREATE POLICY "organizations_public_select" ON organizations FOR SELECT TO public USING (true);
CREATE POLICY "organizations_admin_update" ON organizations FOR UPDATE TO authenticated USING (is_auth_org_admin(id));

-- ORGANIZATION MEMBERS (Fixed Recursion)
CREATE POLICY "org_members_select" ON organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  organization_id IN (SELECT get_auth_org_ids())
);

CREATE POLICY "org_members_manage" ON organization_members FOR ALL TO authenticated
USING (
  is_auth_org_admin(organization_id)
);

-- CAMPAIGNS
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (auth.uid() = user_id)
  OR (organization_id IN (SELECT get_auth_org_ids()))
);

CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT TO authenticated
WITH CHECK (
  public.check_is_admin()
  OR (auth.uid() = user_id)
  OR (organization_id IN (SELECT get_auth_org_ids()))
);

CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE TO authenticated
USING (
  public.check_is_admin()
  OR (auth.uid() = user_id)
  OR (is_auth_org_admin(organization_id))
);

-- TRANSACTIONS
CREATE POLICY "transactions_select_hybrid" ON transactions FOR SELECT TO public
USING (
  public.check_is_admin()
  OR (auth.uid() = user_id)
  OR (status = 'success')
  OR EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = transactions.campaign_id
    AND (
      campaigns.user_id = auth.uid()
      OR 
      (campaigns.organization_id IN (SELECT get_auth_org_ids()))
    )
  )
);

-- 5. EXPLICIT GRANTS (Fixing 406 error)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
