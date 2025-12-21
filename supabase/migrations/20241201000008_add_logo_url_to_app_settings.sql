/*
  # Add logo_url to app_settings
  
  This migration adds a logo_url field to store the application logo URL.
  The logo will be uploaded to S3 compatible storage.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'logo_url') THEN
    ALTER TABLE app_settings ADD COLUMN logo_url text;
  END IF;
END $$;

