-- Production-Ready RLS Policies for Transactions and Campaigns
-- This provides proper security while allowing necessary access

-- =====================================================
-- TRANSACTIONS TABLE POLICIES
-- =====================================================

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to read all transactions
-- (For public dashboard, donation history, etc.)
CREATE POLICY "Allow public read access to transactions"
ON transactions
FOR SELECT
USING (true);

-- Policy 2: Allow service role to insert transactions
-- (For Edge Functions creating transactions)
CREATE POLICY "Allow service role to insert transactions"
ON transactions
FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Policy 3: Allow service role to update transactions
-- (For payment confirmations, status updates)
CREATE POLICY "Allow service role to update transactions"
ON transactions
FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
  OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- =====================================================
-- CAMPAIGNS TABLE POLICIES
-- =====================================================

-- Enable RLS on campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to read all campaigns
CREATE POLICY "Allow public read access to campaigns"
ON campaigns
FOR SELECT
USING (true);

-- Policy 2: Allow authenticated users to create campaigns
CREATE POLICY "Allow authenticated users to create campaigns"
ON campaigns
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow service role to update campaigns
-- (Remove owner check since we don't have created_by column)
CREATE POLICY "Allow service role to update campaigns"
ON campaigns
FOR UPDATE
USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- OPTIONAL: More Restrictive Policies
-- =====================================================

-- If you want to restrict transaction reads to authenticated users only:
-- DROP POLICY "Allow public read access to transactions" ON transactions;
-- CREATE POLICY "Allow authenticated read access to transactions"
-- ON transactions
-- FOR SELECT
-- USING (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Current setup allows public READ access (good for public dashboards)
-- 2. Only service role can INSERT/UPDATE transactions (secure)
-- 3. Anyone can read campaigns (public donation platform)
-- 4. Adjust policies based on your security requirements
