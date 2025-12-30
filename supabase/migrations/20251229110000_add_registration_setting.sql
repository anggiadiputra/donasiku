-- Add Registration Control Settings
-- This migration adds fields to control public user registration.

-- 1. Add fields to app_settings
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS allow_registration boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_message text DEFAULT 'Mohon maaf, pendaftaran pengguna baru saat ini ditutup oleh administrator.';

-- 2. Update RLS to ensure public can read these settings
-- We need to ensure that unauthenticated users (on Login/Register page) can read this config.

ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_s_public" ON app_settings;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public to read specific config fields (including app_name, logo, and registration settings)
CREATE POLICY "app_settings_s_public" ON app_settings FOR SELECT TO public 
USING (true); 
-- Note for dev: In a stricter env, we might want to restrict columns, but Supabase RLS is row-based.
-- For simple config tables, public read is usually fine as long as secrets (SMTP pass) are not exposed.
-- Wait! app_settings contains secrets (email_smtp_password). We MUST NOT allow full public select.

-- REVISION: We cannot allow `USING (true)` for all columns because of secrets.
-- BUT Supabase doesn't support Column Level Security easily in RLS policies without Views or intricate setups.
-- STRATEGY: Data in `app_settings` should be SAFE. Secrets should be in Vault or separate table.
-- HOWEVER, current schema has secrets in `app_settings`.
-- WORKAROUND: We will create a SECURITY DEFINER function to fetch public config safely.

DROP POLICY IF EXISTS "app_settings_s_public" ON app_settings;

-- Only authenticated users (admins) can view EVERYTHING (secrets included)
CREATE POLICY "app_settings_s_admin" ON app_settings FOR SELECT TO authenticated
USING (public.check_is_admin());

-- Public can ONLY view if we use a secure function. 
-- OR we split the table.
-- OR we assume the Frontend client needs to know `allow_registration`.

-- LET'S GO WITH A SECURE VIEW APPROACH for Public Config
CREATE OR REPLACE VIEW public_app_settings AS
SELECT 
  app_name, 
  allow_registration, 
  registration_message,
  whatsapp_phone,
  logo_url, 
  primary_color
FROM app_settings;

-- Grant access to the view
GRANT SELECT ON public_app_settings TO public;
GRANT SELECT ON public_app_settings TO anon;

-- NOTE: If we really want to use direct select on app_settings for ease, 
-- we should move secrets to a separate private_settings table. 
-- For now, let's create a Helper Function to fetch public config.

CREATE OR REPLACE FUNCTION get_public_config()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'app_name', app_name,
    'allow_registration', allow_registration,
    'registration_message', registration_message,
    'whatsapp_enabled', whatsapp_enabled,
    'whatsapp_phone', whatsapp_phone
  ) INTO result
  FROM app_settings
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to public
GRANT EXECUTE ON FUNCTION get_public_config() TO public;
GRANT EXECUTE ON FUNCTION get_public_config() TO anon;
