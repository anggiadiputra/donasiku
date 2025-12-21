/*
  # Fix Campaigns RLS Policy for Public Access
  
  This migration ensures that published campaigns are accessible to public users
  and fixes any RLS policy issues.
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view published campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public campaigns are viewable by everyone" ON campaigns;
DROP POLICY IF EXISTS "Anyone can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;

-- Create RLS Policies for campaigns
-- Public can view published campaigns (this is the most important one)
CREATE POLICY "Public can view published campaigns"
  ON campaigns FOR SELECT
  USING (status = 'published');

-- Authenticated users can view their own campaigns (including drafts)
CREATE POLICY "Users can view their own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Verify that status column exists and has correct values
DO $$
BEGIN
  -- Check if status column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'status'
  ) THEN
    -- Update any NULL status to 'draft'
    UPDATE campaigns SET status = 'draft' WHERE status IS NULL;
    
    -- Log current status distribution
    RAISE NOTICE 'Campaign status distribution:';
    RAISE NOTICE 'Published: %', (SELECT COUNT(*) FROM campaigns WHERE status = 'published');
    RAISE NOTICE 'Draft: %', (SELECT COUNT(*) FROM campaigns WHERE status = 'draft');
  END IF;
END $$;

