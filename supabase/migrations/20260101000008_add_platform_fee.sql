-- Add platform_fee column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

-- Add platform_fee column to profiles table (for independent campaigners)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN organizations.platform_fee IS 'Percentage of operational fee (0-100)';
COMMENT ON COLUMN profiles.platform_fee IS 'Percentage of operational fee (0-100)';
