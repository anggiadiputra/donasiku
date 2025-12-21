/*
  # Allow Public Read Access to app_name
  
  This migration allows public (unauthenticated) users to read the app_name
  from app_settings, so the app name can be displayed in public pages like
  login, header, etc.
  
  Note: This policy allows public to read all columns. In production, consider
  creating a view that only exposes app_name for better security.
*/

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Authenticated users can view settings" ON app_settings;

-- Create policy for authenticated users to view all settings
CREATE POLICY "Authenticated users can view settings"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for public users to view settings (for app_name display)
-- This allows public read access, but sensitive data should not be exposed in UI
CREATE POLICY "Public can view app_name"
  ON app_settings FOR SELECT
  USING (true); -- Allow public read access (primarily for app_name)

