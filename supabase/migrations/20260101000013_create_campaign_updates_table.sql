/*
  # Create Campaign Updates Table
  
  This migration creates the campaign_updates table to store progress updates
  from campaigners.
  
  Fields:
  - id: uuid (PK)
  - campaign_id: uuid (FK)
  - title: text
  - content: text
  - image_url: text (optional)
  - created_at: timestamptz
*/

CREATE TABLE IF NOT EXISTS campaign_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaign_updates ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- 1. Public can view updates for published campaigns
CREATE POLICY "Public can view updates for published campaigns"
  ON campaign_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_updates.campaign_id
      AND campaigns.status = 'published'
    )
  );

-- 2. Campaign Owners can insert updates
CREATE POLICY "Campaign Owners can insert updates"
  ON campaign_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_updates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- 3. Campaign Owners can update their updates
CREATE POLICY "Campaign Owners can update their updates"
  ON campaign_updates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_updates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_updates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- 4. Campaign Owners can delete their updates
CREATE POLICY "Campaign Owners can delete their updates"
  ON campaign_updates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_updates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Create Index
CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign_id ON campaign_updates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_created_at ON campaign_updates(created_at DESC);
