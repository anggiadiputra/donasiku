-- Add is_featured column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add index for performance on home page queries
CREATE INDEX IF NOT EXISTS idx_campaigns_is_featured ON campaigns(is_featured) WHERE status = 'published';
