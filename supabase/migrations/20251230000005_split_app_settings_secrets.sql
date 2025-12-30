-- MIGRATION: SPLIT APP_SETTINGS INTO PUBLIC AND PRIVATE (SECRETS)
-- This fixes the SECURITY DEFINER view warning by making public settings truly public
-- and sensitive secrets truly private in a separate table.

-- 1. Create app_secrets table
CREATE TABLE IF NOT EXISTS app_secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- WhatsApp Secrets
    whatsapp_api_key text,
    whatsapp_api_url text,
    -- Email Secrets
    email_smtp_host text,
    email_smtp_port integer DEFAULT 587,
    email_smtp_user text,
    email_smtp_password text,
    email_from text,
    -- S3 Secrets
    s3_endpoint text,
    s3_region text DEFAULT 'auto',
    s3_bucket text,
    s3_access_key_id text,
    s3_secret_access_key text,
    s3_public_url text,
    s3_api_endpoint text,
    -- Metadata
    updated_at timestamptz DEFAULT now()
);

-- 2. Migrate existing data from app_settings to app_secrets
INSERT INTO app_secrets (
    whatsapp_api_key, whatsapp_api_url,
    email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_from,
    s3_endpoint, s3_region, s3_bucket, s3_access_key_id, s3_secret_access_key, s3_public_url, s3_api_endpoint
)
SELECT 
    whatsapp_api_key, whatsapp_api_url,
    email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_password, email_from,
    s3_endpoint, s3_region, s3_bucket, s3_access_key_id, s3_secret_access_key, s3_public_url, s3_api_endpoint
FROM app_settings
ON CONFLICT DO NOTHING;

-- 3. Remove sensitive columns from app_settings
ALTER TABLE app_settings 
DROP COLUMN IF EXISTS whatsapp_api_key,
DROP COLUMN IF EXISTS whatsapp_api_url,
DROP COLUMN IF EXISTS email_smtp_host,
DROP COLUMN IF EXISTS email_smtp_port,
DROP COLUMN IF EXISTS email_smtp_user,
DROP COLUMN IF EXISTS email_smtp_password,
DROP COLUMN IF EXISTS email_from,
DROP COLUMN IF EXISTS s3_endpoint,
DROP COLUMN IF EXISTS s3_region,
DROP COLUMN IF EXISTS s3_bucket,
DROP COLUMN IF EXISTS s3_access_key_id,
DROP COLUMN IF EXISTS s3_secret_access_key,
DROP COLUMN IF EXISTS s3_public_url,   
DROP COLUMN IF EXISTS s3_api_endpoint;

-- 4. Enable RLS and set policies
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Only Admins can manage secrets
CREATE POLICY "app_secrets_admin_all" ON app_secrets 
FOR ALL TO authenticated 
USING (public.check_is_admin());

-- Update app_settings policies to be PUBLICly readable
DROP POLICY IF EXISTS "app_settings_admin_select" ON app_settings;
DROP POLICY IF EXISTS "app_settings_public_read" ON app_settings;

CREATE POLICY "app_settings_public_read" ON app_settings 
FOR SELECT TO public 
USING (true);

CREATE POLICY "app_settings_admin_update" ON app_settings 
FOR UPDATE TO authenticated 
USING (public.check_is_admin());

-- 5. Cleanup the View
DROP VIEW IF EXISTS public_app_settings;
