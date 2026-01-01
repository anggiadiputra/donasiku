-- Add zakat_fee column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS zakat_fee NUMERIC DEFAULT 0;

-- Add comment
COMMENT ON COLUMN organizations.zakat_fee IS 'Percentage of zakat fee (0-100), relevant for Admin/Amil';
