
-- Add analytics columns to app_settings table
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT;
