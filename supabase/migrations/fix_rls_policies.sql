-- Fix RLS Policies for Transactions and Campaigns
-- This allows the dashboard to read data

-- Disable RLS temporarily (for development/testing)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- OR use proper policies (recommended for production):
-- Enable RLS
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create read-only policies for everyone
-- CREATE POLICY "Enable read access for all users" 
-- ON transactions FOR SELECT 
-- USING (true);

-- CREATE POLICY "Enable read access for campaigns" 
-- ON campaigns FOR SELECT 
-- USING (true);

-- Allow insert for anon users (for donation form)
-- CREATE POLICY "Enable insert for anon users" 
-- ON transactions FOR INSERT 
-- WITH CHECK (true);
