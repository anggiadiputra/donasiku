/*
  # Add Campaign Form Fields and RLS

  1. New Columns
    - `user_id` (uuid) - User who created the campaign
    - `end_date` (date) - Campaign end date
    - `gmaps_link` (text) - Google Maps link
    - `form_type` (text) - Form type: 'donation' or 'zakat'
    - `display_format` (text) - Display format: 'card', 'list', 'typing', 'package', 'package2'
    - `campaign_type` (text) - Campaign type: 'qurban', etc.
    - `preset_amounts` (jsonb) - Array of preset donation amounts
    - `status` (text) - Campaign status: 'draft' or 'published'
    - `category_id` (uuid) - Foreign key to categories table

  2. RLS Policies
    - Users can only read their own campaigns (read-only)
    - Users can insert their own campaigns
    - Users can update their own campaigns
*/

DO $$
BEGIN
  -- Check if campaigns table exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'campaigns'
  ) THEN
    -- Add user_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add end_date
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'end_date'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN end_date date;
    END IF;

    -- Add gmaps_link
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'gmaps_link'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN gmaps_link text;
    END IF;

    -- Add form_type
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'form_type'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN form_type text DEFAULT 'donation';
    END IF;

    -- Add display_format
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'display_format'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN display_format text DEFAULT 'card';
    END IF;

    -- Add campaign_type
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'campaign_type'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN campaign_type text;
    END IF;

    -- Add preset_amounts
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'preset_amounts'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN preset_amounts jsonb DEFAULT '[]'::jsonb;
    END IF;

    -- Add status
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'status'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN status text DEFAULT 'draft';
    END IF;

    -- Add category_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'category_id'
    ) THEN
      ALTER TABLE campaigns ADD COLUMN category_id uuid REFERENCES categories(id);
    END IF;
  END IF;
END $$;

-- Drop existing policies if they exist (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'campaigns'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can view campaigns" ON campaigns;
    DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
    DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
    DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
    DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;

    -- Create RLS policies for campaigns
    -- Users can only read their own campaigns (read-only)
    CREATE POLICY "Users can view their own campaigns"
      ON campaigns FOR SELECT
      USING (auth.uid() = user_id);

    -- Users can insert their own campaigns
    CREATE POLICY "Users can insert their own campaigns"
      ON campaigns FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    -- Users can update their own campaigns
    CREATE POLICY "Users can update their own campaigns"
      ON campaigns FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Users can delete their own campaigns
    CREATE POLICY "Users can delete their own campaigns"
      ON campaigns FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

