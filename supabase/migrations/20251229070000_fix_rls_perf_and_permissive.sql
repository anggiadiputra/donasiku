-- Optimization of RLS Performance - Phase 2 (REVISED)
-- This migration resolves "Auth RLS Initialization Plan" and "Multiple Permissive Policies" warnings.
-- Fixed syntax error: Combined actions (INSERT, UPDATE, DELETE) are not supported in one CREATE POLICY statement.

-- Ensure helper functions exist (idempotent)
CREATE OR REPLACE FUNCTION public.get_auth_uid()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT auth.role();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 1. whatsapp_messages
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert whatsapp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert_public" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_select_admin" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_update_admin" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_delete_admin" ON whatsapp_messages;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_messages_i_public" ON whatsapp_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "whatsapp_messages_s_admin" ON whatsapp_messages FOR SELECT TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "whatsapp_messages_u_admin" ON whatsapp_messages FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "whatsapp_messages_d_admin" ON whatsapp_messages FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 2. payment_methods
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Authenticated users can view all payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Authenticated users can manage payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Allow public read access to payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Allow authenticated manage payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_select_public" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_manage_admin" ON payment_methods;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_s_public" ON payment_methods FOR SELECT TO public USING (true);
CREATE POLICY "payment_methods_i_admin" ON payment_methods FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "payment_methods_u_admin" ON payment_methods FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "payment_methods_d_admin" ON payment_methods FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 3. app_settings
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage app_settings" ON app_settings;
DROP POLICY IF EXISTS "Allow public read access to app_settings" ON app_settings;
DROP POLICY IF EXISTS "Public can view app_name" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON app_settings;
DROP POLICY IF EXISTS "Public can view app name and logo" ON app_settings;
DROP POLICY IF EXISTS "app_settings_select_public" ON app_settings;
DROP POLICY IF EXISTS "app_settings_manage_admin" ON app_settings;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_s_public" ON app_settings FOR SELECT TO public USING (true);
CREATE POLICY "app_settings_i_admin" ON app_settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "app_settings_u_admin" ON app_settings FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "app_settings_d_admin" ON app_settings FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 4. layout_settings
ALTER TABLE layout_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage layout_settings" ON layout_settings;
DROP POLICY IF EXISTS "Allow public read access to layout_settings" ON layout_settings;
DROP POLICY IF EXISTS "Authenticated users can view layout settings" ON layout_settings;
DROP POLICY IF EXISTS "Authenticated users can update layout settings" ON layout_settings;
DROP POLICY IF EXISTS "Authenticated users can insert layout settings" ON layout_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON layout_settings;
DROP POLICY IF EXISTS "layout_settings_select_public" ON layout_settings;
DROP POLICY IF EXISTS "layout_settings_manage_admin" ON layout_settings;
ALTER TABLE layout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "layout_settings_s_public" ON layout_settings FOR SELECT TO public USING (true);
CREATE POLICY "layout_settings_i_admin" ON layout_settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "layout_settings_u_admin" ON layout_settings FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "layout_settings_d_admin" ON layout_settings FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 5. campaigns
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow authenticated users to create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public can view published campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow service role to update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "campaigns_select_public" ON campaigns;
DROP POLICY IF EXISTS "campaigns_insert_authenticated" ON campaigns;
DROP POLICY IF EXISTS "campaigns_owner_manage" ON campaigns;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_s_public" ON campaigns FOR SELECT TO public USING (true);
CREATE POLICY "campaigns_i_auth" ON campaigns FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "campaigns_u_owner" ON campaigns FOR UPDATE TO authenticated USING ((SELECT public.get_auth_uid()) = user_id);
CREATE POLICY "campaigns_d_owner" ON campaigns FOR DELETE TO authenticated USING ((SELECT public.get_auth_uid()) = user_id);

-- 6. categories
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access to categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "categories_select_public" ON categories;
DROP POLICY IF EXISTS "categories_manage_admin" ON categories;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_s_public" ON categories FOR SELECT TO public USING (true);
CREATE POLICY "categories_i_admin" ON categories FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "categories_u_admin" ON categories FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "categories_d_admin" ON categories FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 7. zakat_settings
ALTER TABLE zakat_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage zakat_settings" ON zakat_settings;
DROP POLICY IF EXISTS "Allow public read access to zakat_settings" ON zakat_settings;
DROP POLICY IF EXISTS "Public can view zakat settings" ON zakat_settings;
DROP POLICY IF EXISTS "Authenticated users can view zakat settings" ON zakat_settings;
DROP POLICY IF EXISTS "Authenticated users can update zakat settings" ON zakat_settings;
DROP POLICY IF EXISTS "Authenticated users can insert zakat settings" ON zakat_settings;
DROP POLICY IF EXISTS "zakat_settings_select_public" ON zakat_settings;
DROP POLICY IF EXISTS "zakat_settings_manage_admin" ON zakat_settings;
ALTER TABLE zakat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zakat_settings_s_public" ON zakat_settings FOR SELECT TO public USING (true);
CREATE POLICY "zakat_settings_i_admin" ON zakat_settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "zakat_settings_u_admin" ON zakat_settings FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "zakat_settings_d_admin" ON zakat_settings FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 8. infaq_settings
ALTER TABLE infaq_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage infaq_settings" ON infaq_settings;
DROP POLICY IF EXISTS "Allow public read access to infaq_settings" ON infaq_settings;
DROP POLICY IF EXISTS "Authenticated users can view infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "Authenticated users can update infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "Authenticated users can insert infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "Public can view infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "infaq_settings_select_public" ON infaq_settings;
DROP POLICY IF EXISTS "infaq_settings_manage_admin" ON infaq_settings;
ALTER TABLE infaq_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "infaq_settings_s_public" ON infaq_settings FOR SELECT TO public USING (true);
CREATE POLICY "infaq_settings_i_admin" ON infaq_settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "infaq_settings_u_admin" ON infaq_settings FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "infaq_settings_d_admin" ON infaq_settings FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 9. fidyah_settings
ALTER TABLE fidyah_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage fidyah_settings" ON fidyah_settings;
DROP POLICY IF EXISTS "Allow public read access to fidyah_settings" ON fidyah_settings;
DROP POLICY IF EXISTS "Allow public read access" ON fidyah_settings;
DROP POLICY IF EXISTS "Allow authenticated update access" ON fidyah_settings;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON fidyah_settings;
DROP POLICY IF EXISTS "fidyah_settings_select_public" ON fidyah_settings;
DROP POLICY IF EXISTS "fidyah_settings_manage_admin" ON fidyah_settings;
ALTER TABLE fidyah_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fidyah_settings_s_public" ON fidyah_settings FOR SELECT TO public USING (true);
CREATE POLICY "fidyah_settings_i_admin" ON fidyah_settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "fidyah_settings_u_admin" ON fidyah_settings FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "fidyah_settings_d_admin" ON fidyah_settings FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 10. profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_owner_manage" ON profiles;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_s_public" ON profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_i_owner" ON profiles FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_auth_uid()) = id);
CREATE POLICY "profiles_u_owner" ON profiles FOR UPDATE TO authenticated USING ((SELECT public.get_auth_uid()) = id);
CREATE POLICY "profiles_d_owner" ON profiles FOR DELETE TO authenticated USING ((SELECT public.get_auth_uid()) = id);

-- 11. testimonials
ALTER TABLE testimonials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage testimonials" ON testimonials;
DROP POLICY IF EXISTS "Allow public read access to approved testimonials" ON testimonials;
DROP POLICY IF EXISTS "Allow anyone to insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Anyone can view approved testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can update own testimonials" ON testimonials;
DROP POLICY IF EXISTS "Service role can do anything with testimonials" ON testimonials;
DROP POLICY IF EXISTS "testimonials_select_public" ON testimonials;
DROP POLICY IF EXISTS "testimonials_insert_public" ON testimonials;
DROP POLICY IF EXISTS "testimonials_manage_admin" ON testimonials;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "testimonials_s_public" ON testimonials FOR SELECT TO public USING (is_approved = true OR (SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "testimonials_i_public" ON testimonials FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "testimonials_u_admin" ON testimonials FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "testimonials_d_admin" ON testimonials FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');

-- 12. transactions
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated manage transactions" ON transactions;
DROP POLICY IF EXISTS "Allow public read access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anyone to create transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to update transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions by email" ON transactions;
DROP POLICY IF EXISTS "Anyone can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "transactions_select_public" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_public" ON transactions;
DROP POLICY IF EXISTS "transactions_manage_admin" ON transactions;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_s_public" ON transactions FOR SELECT TO public USING (true);
CREATE POLICY "transactions_i_public" ON transactions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "transactions_u_admin" ON transactions FOR UPDATE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
CREATE POLICY "transactions_d_admin" ON transactions FOR DELETE TO authenticated USING ((SELECT public.get_auth_role()) = 'authenticated');
