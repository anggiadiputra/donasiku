-- EMERGENCY RBAC & RLS RESET SCRIPT
-- RUN THIS TO FIX ALL 406/500/EMPTY DATA ISSUES

-- 1. Helper Functions (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_auth_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$;

-- 2. Drop existing policies to start fresh
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('app_settings', 'organizations', 'organization_members', 'campaigns', 'transactions', 'profiles')) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 3. Reset RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. APP SETTINGS (Public access for general config)
CREATE POLICY "app_settings_public_read" ON app_settings FOR SELECT TO public USING (true);
CREATE POLICY "app_settings_admin_all" ON app_settings FOR ALL TO authenticated USING (public.check_is_admin());

-- 5. ORGANIZATIONS
CREATE POLICY "orgs_read_all" ON organizations FOR SELECT TO public USING (true);
CREATE POLICY "orgs_manage_owners" ON organizations FOR ALL TO authenticated USING (is_auth_org_admin(id) OR public.check_is_admin());

-- 6. ORGANIZATION MEMBERS
CREATE POLICY "org_members_read" ON organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR organization_id IN (SELECT get_auth_org_ids()) OR public.check_is_admin());
CREATE POLICY "org_members_manage" ON organization_members FOR ALL TO authenticated USING (is_auth_org_admin(organization_id) OR public.check_is_admin());

-- 7. CAMPAIGNS (The core visibility issue)
CREATE POLICY "campaigns_read_all" ON campaigns FOR SELECT TO public USING (true); -- Public can see all campaigns
CREATE POLICY "campaigns_manage" ON campaigns FOR ALL TO authenticated 
USING (auth.uid() = user_id OR is_auth_org_admin(organization_id) OR public.check_is_admin())
WITH CHECK (auth.uid() = user_id OR is_auth_org_admin(organization_id) OR public.check_is_admin());

-- 8. TRANSACTIONS
CREATE POLICY "transactions_read_all" ON transactions FOR SELECT TO public USING (true); -- Public/Authenticated can see all success/own transactions (filtered by app logic anyway)
CREATE POLICY "transactions_manage_admins" ON transactions FOR ALL TO authenticated USING (public.check_is_admin());

-- 9. PROFILES
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_manage_self" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 10. GRANTS (CRITICAL for 406 errors)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Final check for check_is_admin to ensure it never recurses
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
