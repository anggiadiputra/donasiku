-- Fix Organization Insert Policy
-- Previous migration seemed to miss an explicit INSERT policy for organizations.
-- This allows Platform Admins to create organizations for others (owner_id != auth.uid())
-- And Regular users to create organizations for themselves (owner_id = auth.uid())

CREATE POLICY "organizations_i_insert" ON organizations FOR INSERT TO authenticated
WITH CHECK (
  -- Platform Admin can insert anything
  public.check_is_admin()
  OR
  -- Regular users must be the owner
  (auth.uid() = owner_id)
);
