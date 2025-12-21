/*
  # Create Settings Table
  
  This migration creates the app_settings table to store web app configuration.
  
  Fields:
  - app_name: Application name
  - payment_methods: JSON array of enabled payment methods
  - whatsapp_enabled: Enable/disable WhatsApp notifications
  - whatsapp_api_key: WhatsApp API key (Fonnte or similar)
  - whatsapp_api_url: WhatsApp API endpoint
  - whatsapp_phone: WhatsApp phone number for notifications
  - email_enabled: Enable/disable email notifications
  - email_smtp_host: SMTP host
  - email_smtp_port: SMTP port
  - email_smtp_user: SMTP username
  - email_smtp_password: SMTP password (encrypted)
  - email_from: Email sender address
  - s3_endpoint: S3 compatible endpoint
  - s3_region: S3 region
  - s3_bucket: S3 bucket name
  - s3_access_key_id: S3 access key
  - s3_secret_access_key: S3 secret key (encrypted)
  - s3_public_url: S3 public URL
  - s3_api_endpoint: Backend API endpoint for S3 uploads
  - updated_at: Last update timestamp
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Application Settings
  app_name text DEFAULT 'Donasiku',
  
  -- Payment Methods (JSON array: ['bank_transfer', 'credit_card', 'e_wallet', 'qris'])
  payment_methods jsonb DEFAULT '["bank_transfer", "qris"]'::jsonb,
  
  -- WhatsApp Notifications
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_api_key text,
  whatsapp_api_url text,
  whatsapp_phone text,
  
  -- Email Notifications
  email_enabled boolean DEFAULT false,
  email_smtp_host text,
  email_smtp_port integer DEFAULT 587,
  email_smtp_user text,
  email_smtp_password text, -- Should be encrypted in production
  email_from text,
  
  -- S3 Compatible Storage
  s3_endpoint text,
  s3_region text DEFAULT 'auto',
  s3_bucket text,
  s3_access_key_id text,
  s3_secret_access_key text, -- Should be encrypted in production
  s3_public_url text,
  s3_api_endpoint text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can update settings
CREATE POLICY "Authenticated users can update settings"
  ON app_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Insert default settings (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1) THEN
    INSERT INTO app_settings (app_name, payment_methods, whatsapp_enabled, email_enabled)
    VALUES (
      'Donasiku',
      '["bank_transfer", "qris"]'::jsonb,
      false,
      false
    );
  END IF;
END $$;

