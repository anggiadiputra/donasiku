/*
  # Add Slug Column to Campaigns Table
  
  Adds a slug column to the campaigns table for URL-friendly campaign identifiers.
  Slug is auto-generated from title but can be customized.
*/

DO $$
BEGIN
  -- Check if campaigns table exists and slug column doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'campaigns'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'slug'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN slug text;
    
    -- Create index for slug
    CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
    
    -- Make slug unique
    CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_slug_unique ON campaigns(slug) WHERE slug IS NOT NULL;
  END IF;
END $$;

