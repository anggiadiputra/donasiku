-- Fix RLS policies for layout_settings to allow public read access
-- This ensures unauthenticated users (logout state) can see the same Home Page configuration as logged-in users.

-- Enable RLS (just to be safe)
ALTER TABLE layout_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Authenticated users can view layout settings" ON layout_settings;

-- Create new policy for public read access
CREATE POLICY "Enable read access for all users"
ON layout_settings FOR SELECT
USING (true);

-- Ensure other operations still require authentication (optional but recommended)
-- (Existing policies for INSERT/UPDATE usually cover this, but we leave them intact)
