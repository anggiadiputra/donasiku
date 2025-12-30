-- RLS Performance Optimization
-- This migration implements optimized auth helper functions and updates RLS policies
-- to use the subquery pattern, preventing re-evaluation of auth checks for every row.

-- 1. Create optimized auth helper functions
CREATE OR REPLACE FUNCTION public.get_auth_uid()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT auth.role();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Update RLS policies for campaigns
DROP POLICY IF EXISTS "Allow public read access to campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow authenticated users to create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow service role to update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;

CREATE POLICY "Allow public read access to campaigns"
ON campaigns FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to create campaigns"
ON campaigns FOR INSERT
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

CREATE POLICY "Users can manage their own campaigns"
ON campaigns FOR ALL
USING ((SELECT public.get_auth_uid()) = user_id)
WITH CHECK ((SELECT public.get_auth_uid()) = user_id);

-- 3. Update RLS policies for app_settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON app_settings;
DROP POLICY IF EXISTS "Public can view app name and logo" ON app_settings;

CREATE POLICY "Allow public read access to app_settings"
ON app_settings FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage app_settings"
ON app_settings FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 4. Update RLS policies for layout_settings
DROP POLICY IF EXISTS "Authenticated users can view layout settings" ON layout_settings;
DROP POLICY IF EXISTS "Authenticated users can update layout settings" ON layout_settings;
DROP POLICY IF EXISTS "Authenticated users can insert layout settings" ON layout_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON layout_settings;

CREATE POLICY "Allow public read access to layout_settings"
ON layout_settings FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage layout_settings"
ON layout_settings FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 5. Update RLS policies for infaq_settings, zakat_settings, and fidyah_settings
-- Infaq
DROP POLICY IF EXISTS "Authenticated users can view infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "Authenticated users can update infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "Authenticated users can insert infaq settings" ON infaq_settings;
DROP POLICY IF EXISTS "Public can view infaq settings" ON infaq_settings;

CREATE POLICY "Allow public read access to infaq_settings"
ON infaq_settings FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage infaq_settings"
ON infaq_settings FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- Zakat
DROP POLICY IF EXISTS "Authenticated users can view zakat settings" ON zakat_settings;
DROP POLICY IF EXISTS "Authenticated users can update zakat settings" ON zakat_settings;
DROP POLICY IF EXISTS "Authenticated users can insert zakat settings" ON zakat_settings;

CREATE POLICY "Allow public read access to zakat_settings"
ON zakat_settings FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage zakat_settings"
ON zakat_settings FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- Fidyah
DROP POLICY IF EXISTS "Allow public read access" ON fidyah_settings;
DROP POLICY IF EXISTS "Allow authenticated update access" ON fidyah_settings;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON fidyah_settings;

CREATE POLICY "Allow public read access to fidyah_settings"
ON fidyah_settings FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage fidyah_settings"
ON fidyah_settings FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 6. Update RLS policies for categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;

CREATE POLICY "Allow public read access to categories"
ON categories FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage categories"
ON categories FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 7. Update RLS policies for transactions
DROP POLICY IF EXISTS "Allow public read access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to update transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions by email" ON transactions;
DROP POLICY IF EXISTS "Anyone can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;

CREATE POLICY "Allow public read access to transactions"
ON transactions FOR SELECT
USING (true);

CREATE POLICY "Allow anyone to create transactions"
ON transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated manage transactions"
ON transactions FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 8. Update RLS policies for payment_methods
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Only authenticated users can managed payment methods" ON payment_methods;

CREATE POLICY "Allow public read access to payment_methods"
ON payment_methods FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage payment_methods"
ON payment_methods FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 9. Update RLS policies for testimonials
DROP POLICY IF EXISTS "Anyone can view approved testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authenticated users can insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can update own testimonials" ON testimonials;
DROP POLICY IF EXISTS "Service role can do anything with testimonials" ON testimonials;

CREATE POLICY "Allow public read access to approved testimonials"
ON testimonials FOR SELECT
USING (is_approved = true OR (SELECT public.get_auth_role()) = 'authenticated');

CREATE POLICY "Allow anyone to insert testimonials"
ON testimonials FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated manage testimonials"
ON testimonials FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

-- 10. Update RLS policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Allow public read access to profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated manage profiles"
ON public.profiles FOR ALL
USING ((SELECT public.get_auth_role()) = 'authenticated')
WITH CHECK ((SELECT public.get_auth_role()) = 'authenticated');

CREATE POLICY "Users can manage own profile"
ON public.profiles FOR ALL
USING ((SELECT public.get_auth_uid()) = id)
WITH CHECK ((SELECT public.get_auth_uid()) = id);
