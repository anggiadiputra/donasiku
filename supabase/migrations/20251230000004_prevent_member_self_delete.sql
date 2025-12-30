-- SAFETY SEAL: PREVENT MEMBERS FROM LEAVING WITHOUT PERMISSION
-- Only Admins, Owners, or System Admins can delete ANY record in organization_members.

-- 1. Drop the old manage policy if it's too loose
DROP POLICY IF EXISTS "org_members_manage" ON organization_members;
DROP POLICY IF EXISTS "org_members_manage_admins" ON organization_members;

-- 2. Create the strict policy
-- This policy says: You can only DELETE or UPDATE if you are an ADMIN/OWNER of that organization.
-- Since a regular 'member' fails the 'is_auth_org_admin' check, they cannot delete themselves.
CREATE POLICY "org_members_admin_control" ON organization_members 
FOR ALL TO authenticated
USING (
  is_auth_org_admin(organization_id) 
  OR public.check_is_admin()
)
WITH CHECK (
  is_auth_org_admin(organization_id) 
  OR public.check_is_admin()
);

-- Note: 'member' can still SELECT (view) their own membership via "org_members_read" policy,
-- but they can no longer DELETE it.
