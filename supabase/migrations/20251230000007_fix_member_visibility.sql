-- MIGRATION: FIX MEMBER VISIBILITY FOR CAMPAIGNS & TRANSACTIONS
-- Ensuring organization members can see and manage organization data.

-- 1. Helper for Organization ID check (non-recursive)
CREATE OR REPLACE FUNCTION public.is_member_of_org(org_id uuid)
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
  );
$$;

-- 2. Update Campaigns Policies
DROP POLICY IF EXISTS "campaigns_read_all" ON campaigns;
DROP POLICY IF EXISTS "campaigns_manage" ON campaigns;
DROP POLICY IF EXISTS "campaigns_s_hybrid" ON campaigns; -- From older migrations

-- SELECT: Anyone can see published, but members can see everything in their org
CREATE POLICY "campaigns_select_policy" ON campaigns FOR SELECT TO public
USING (
    status = 'published'
    OR auth.uid() = user_id
    OR (organization_id IS NOT NULL AND public.is_member_of_org(organization_id))
    OR public.check_is_admin()
);

-- ALL (Insert/Update/Delete): Owner, Org Admin/Owner, or Org Member
-- We allow members to MANAGE (Update) campaigns for the org they belong to.
CREATE POLICY "campaigns_manage_policy" ON campaigns FOR ALL TO authenticated
USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND public.is_member_of_org(organization_id))
    OR public.check_is_admin()
)
WITH CHECK (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND public.is_member_of_org(organization_id))
    OR public.check_is_admin()
);

-- 3. Update Transactions Policies
DROP POLICY IF EXISTS "transactions_read_all" ON transactions;
DROP POLICY IF EXISTS "transactions_s_rbac" ON transactions;

CREATE POLICY "transactions_select_policy" ON transactions FOR SELECT TO public
USING (
    status = 'success' -- Public can see success for donor lists
    OR auth.uid() = user_id -- Own donation
    OR (campaign_id IN (
        SELECT id FROM campaigns 
        WHERE user_id = auth.uid() 
        OR (organization_id IS NOT NULL AND public.is_member_of_org(organization_id))
    ))
    OR public.check_is_admin()
);

-- 4. Ensure Organization Members are readable by fellow members
DROP POLICY IF EXISTS "org_members_read" ON organization_members;
CREATE POLICY "org_members_read_policy" ON organization_members FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    OR public.check_is_admin()
);
