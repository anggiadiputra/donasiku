-- HARDENING SCRIPT FOR APP SETTINGS (FIXED VIEW)
-- This version drops the view before recreating it to avoid column name mismatch errors.

-- 1. Restrict app_settings Table
DROP POLICY IF EXISTS "app_settings_public_read" ON app_settings;
DROP POLICY IF EXISTS "app_settings_public_select" ON app_settings;
DROP POLICY IF EXISTS "app_settings_s_public" ON app_settings;
DROP POLICY IF EXISTS "app_settings_s_admin" ON app_settings;

CREATE POLICY "app_settings_admin_select" ON app_settings FOR SELECT TO authenticated
USING (public.check_is_admin());

-- 2. Drop and Recreate Public View with Safe Columns
-- Column structure changed, so we must DROP first.
DROP VIEW IF EXISTS public_app_settings;

CREATE VIEW public_app_settings AS
SELECT 
  id, 
  app_name, 
  tagline,
  logo_url, 
  primary_color, 
  payment_methods, 
  whatsapp_enabled, 
  whatsapp_phone, 
  whatsapp_template,
  allow_registration, 
  registration_message, 
  google_analytics_id, 
  facebook_pixel_id, 
  tiktok_pixel_id,
  created_at, 
  updated_at
FROM app_settings;

-- 3. Grant proper permissions
GRANT SELECT ON public_app_settings TO anon, authenticated;
GRANT SELECT ON public_app_settings TO public;

-- Ensure RLS is still on but we allow the view to be used
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
