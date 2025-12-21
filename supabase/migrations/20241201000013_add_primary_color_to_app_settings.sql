/*
  # Add primary_color to app_settings
  
  This migration adds a primary_color field to store the primary theme color for the application.
  The color will be used throughout the application UI.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'primary_color') THEN
    ALTER TABLE app_settings ADD COLUMN primary_color text DEFAULT '#f97316';
  END IF;
END $$;

