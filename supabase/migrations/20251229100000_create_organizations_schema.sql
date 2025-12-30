-- Create Organizations Schema
-- This migration supports the "Organization" model where multiple users can manage shared campaigns.

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Add organization_id to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);

-- 4. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Organizations

-- Public can view basic org info (needed for public campaign pages)
CREATE POLICY "organizations_s_public" ON organizations FOR SELECT TO public USING (true);

-- Members can update their organization
CREATE POLICY "organizations_u_members" ON organizations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Only system admins or the owner can delete
CREATE POLICY "organizations_d_owner" ON organizations FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.check_is_admin());

-- 6. RLS Policies for Organization Members

-- Members can view other members in their orgs
CREATE POLICY "org_members_s_self" ON organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Only admins/owners can manage members
CREATE POLICY "org_members_all_admins" ON organization_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = organization_members.organization_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);


-- 7. UPDATE Campaign RLS Policies to include Organizations
-- We need to replace the previous policies to include the OR conditions for organizations.

ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_s_owner" ON campaigns; -- From previous migration
DROP POLICY IF EXISTS "campaigns_i_auth" ON campaigns;
DROP POLICY IF EXISTS "campaigns_u_owner" ON campaigns;
DROP POLICY IF EXISTS "campaigns_d_owner" ON campaigns;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner OR Org Member
CREATE POLICY "campaigns_s_hybrid" ON campaigns FOR SELECT TO authenticated
USING (
  -- System Admin
  public.check_is_admin()
  -- Individual Owner
  OR (auth.uid() = user_id)
  -- Organization Member
  OR (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = campaigns.organization_id 
      AND user_id = auth.uid()
    )
  )
);

-- INSERT: Authenticated (User or Org Admin)
CREATE POLICY "campaigns_i_hybrid" ON campaigns FOR INSERT TO authenticated
WITH CHECK (
  -- System Admin
  public.check_is_admin()
  -- Individual Owner
  OR (auth.uid() = user_id)
  -- Organization Member (Any member can create, but maybe restricted later)
  OR (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = campaigns.organization_id 
      AND user_id = auth.uid()
    )
  )
);

-- UPDATE: Owner OR Org Admin
CREATE POLICY "campaigns_u_hybrid" ON campaigns FOR UPDATE TO authenticated
USING (
  -- System Admin
  public.check_is_admin()
  -- Individual Owner
  OR (auth.uid() = user_id)
  -- Organization Admin
  OR (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = campaigns.organization_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin') -- Only admins can edit campaigns?
    )
  )
);

-- DELETE: Owner OR Org Admin
CREATE POLICY "campaigns_d_hybrid" ON campaigns FOR DELETE TO authenticated
USING (
  -- System Admin
  public.check_is_admin()
  -- Individual Owner
  OR (auth.uid() = user_id)
  -- Organization Admin
  OR (
    organization_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = campaigns.organization_id 
      AND role IN ('owner', 'admin')
    )
  )
);

-- 8. UPDATE Transaction RLS Policies for Organizations
-- We need to ensure Org Members can see transactions for their Org's campaigns

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_s_rbac" ON transactions; -- From previous migration
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_s_org_hybrid" ON transactions FOR SELECT TO public
USING (
  -- 1. System Admin
  public.check_is_admin()
  
  -- 2. Transaction Owner (The Donor)
  OR (auth.uid() = user_id)
  
  -- 3. Campaign Manager (Individual Owner OR Org Member)
  OR EXISTS (
    SELECT 1 FROM campaigns
    LEFT JOIN organization_members ON campaigns.organization_id = organization_members.organization_id
    WHERE campaigns.id = transactions.campaign_id
    AND (
      -- Is Key Holder (Individual)
      campaigns.user_id = auth.uid()
      OR 
      -- Is Org Member
      (organization_members.user_id = auth.uid())
    )
  )
  
  -- 4. Public View (Successful ones only, for ticker/list)
  OR (status = 'success')
);
