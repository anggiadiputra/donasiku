-- Add font_family column to app_settings table
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';

-- Add comment
COMMENT ON COLUMN app_settings.font_family IS 'Global font family for the application (e.g., Inter, Poppins, Roboto)';
