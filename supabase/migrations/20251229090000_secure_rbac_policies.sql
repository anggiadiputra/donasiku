-- Role-Based Access Control (RBAC) Security Hardening
-- This migration restricts data visibility according to user roles (admin, campaigner, user).

-- 1. Create RBAC helpers (ensure search_path is secure)
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_campaigner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'campaigner'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Secure campaigns table
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_s_public" ON campaigns;
DROP POLICY IF EXISTS "campaigns_i_auth" ON campaigns;
DROP POLICY IF EXISTS "campaigns_u_owner" ON campaigns;
DROP POLICY IF EXISTS "campaigns_d_owner" ON campaigns;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Public can see published campaigns
CREATE POLICY "campaigns_s_public" ON campaigns FOR SELECT TO public 
  USING (status = 'published');

-- Admins can see all campaigns
CREATE POLICY "campaigns_s_admin" ON campaigns FOR SELECT TO authenticated
  USING (public.check_is_admin());

-- Campaigners can see their own campaigns (including drafts)
CREATE POLICY "campaigns_s_owner" ON campaigns FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Standard insert/update/delete policies
CREATE POLICY "campaigns_i_auth" ON campaigns FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id OR public.check_is_admin());

CREATE POLICY "campaigns_u_owner" ON campaigns FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id OR public.check_is_admin());

CREATE POLICY "campaigns_d_owner" ON campaigns FOR DELETE TO authenticated 
  USING (auth.uid() = user_id OR public.check_is_admin());


-- 3. Secure transactions table
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_s_public" ON transactions;
DROP POLICY IF EXISTS "transactions_i_public" ON transactions;
DROP POLICY IF EXISTS "transactions_u_admin" ON transactions;
DROP POLICY IF EXISTS "transactions_d_admin" ON transactions;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Select policy: Multi-layered
CREATE POLICY "transactions_s_rbac" ON transactions FOR SELECT TO public
  USING (
    -- Admins see all
    public.check_is_admin()
    -- Campaigners see transactions for campaigns they OWN
    OR EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = transactions.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
    -- Users see their own personal donations
    OR (auth.uid() = user_id)
    -- Public can see basic donation info for successful transactions (for donor lists)
    -- We restrict this to just successful ones to avoid leaking pending attempts
    OR (status = 'success')
  );

-- Insert: Anyone can donate (public)
CREATE POLICY "transactions_i_public" ON transactions FOR INSERT TO public WITH CHECK (true);

-- Update: Only admins or system (via authenticated/service_role)
CREATE POLICY "transactions_u_rbac" ON transactions FOR UPDATE TO authenticated
  USING (public.check_is_admin());

-- Delete: Only admins
CREATE POLICY "transactions_d_rbac" ON transactions FOR DELETE TO authenticated
  USING (public.check_is_admin());


-- 4. Secure whatsapp_messages table
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_messages_s_admin" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_u_admin" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_d_admin" ON whatsapp_messages;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Only true admins can see/manage WhatsApp messages
CREATE POLICY "whatsapp_messages_s_admin" ON whatsapp_messages FOR SELECT TO authenticated 
  USING (public.check_is_admin());

CREATE POLICY "whatsapp_messages_u_admin" ON whatsapp_messages FOR UPDATE TO authenticated 
  USING (public.check_is_admin());

CREATE POLICY "whatsapp_messages_d_admin" ON whatsapp_messages FOR DELETE TO authenticated 
  USING (public.check_is_admin());
