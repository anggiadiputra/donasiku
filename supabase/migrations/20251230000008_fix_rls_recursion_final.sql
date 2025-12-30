-- MIGRATION: FIX RLS RECURSION IN ORGANIZATION MEMBERS
-- Selective fix for the recursion issue in the previous migration.

-- 1. Ensure helper functions exist and are stable
CREATE OR REPLACE FUNCTION public.get_auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

-- 2. Update Organization Members Policy to avoid recursion
-- Direct SELECT on the same table in a policy causes infinite recursion.
DROP POLICY IF EXISTS "org_members_read_policy" ON organization_members;
DROP POLICY IF EXISTS "org_members_read" ON organization_members;

CREATE POLICY "org_members_read_v2" ON organization_members FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.get_auth_org_ids())
    OR public.check_is_admin()
);

-- 3. Verify organizations policy (should be fine but let's be sure)
DROP POLICY IF EXISTS "orgs_read_all" ON organizations;
CREATE POLICY "orgs_read_all" ON organizations FOR SELECT TO public USING (true);

-- 4. Re-grant permissions just in case
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
