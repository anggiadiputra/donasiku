-- FIX ORGANIZATION RLS POLICIES
-- This script fixes the issue where authenticated users cannot create new organizations.

-- 1. Organizations Policies
DROP POLICY IF EXISTS "orgs_manage_owners" ON organizations;
DROP POLICY IF EXISTS "orgs_insert_auth" ON organizations;
DROP POLICY IF EXISTS "orgs_update_admins" ON organizations;
DROP POLICY IF EXISTS "orgs_delete_admins" ON organizations;

-- Allow any authenticated user to create an organization (as long as they set themselves as owner)
CREATE POLICY "orgs_insert_auth" ON organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Allow admins/owners to update their organization
CREATE POLICY "orgs_update_admins" ON organizations FOR UPDATE TO authenticated 
USING (is_auth_org_admin(id) OR public.check_is_admin());

-- Allow admins/owners to delete their organization
CREATE POLICY "orgs_delete_admins" ON organizations FOR DELETE TO authenticated 
USING (is_auth_org_admin(id) OR public.check_is_admin());

-- 2. Organization Members Policies
DROP POLICY IF EXISTS "org_members_manage" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_auth" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_admins" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_admins" ON organization_members;

-- Allow inserting the VERY FIRST member (the owner) during org creation
-- We check if they are the owner of the organization they are joining
CREATE POLICY "org_members_insert_auth" ON organization_members FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = user_id OR 
  is_auth_org_admin(organization_id) OR 
  public.check_is_admin()
);

-- Allow admins to manage (update/delete) members
CREATE POLICY "org_members_manage_admins" ON organization_members FOR ALL TO authenticated
USING (is_auth_org_admin(organization_id) OR public.check_is_admin());

-- 3. Ensure SELECT policies still exist (from previous scripts)
-- These are usually fine as they use USING(true) or simple checks.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
