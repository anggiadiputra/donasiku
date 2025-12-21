/*
  # Create Complete Campaigns Table
  
  This migration creates the campaigns table with all required fields
  based on the Add New Campaign form.
  
  Fields:
  - Basic info: id, title, description, image_url
  - Donation details: target_amount, current_amount, end_date
  - Location: target_location, gmaps_link
  - Form settings: form_type, display_format, campaign_type, preset_amounts
  - Status: status, category_id
  - Metadata: user_id, created_at, updated_at
  - Legacy fields: category, is_urgent, is_verified, full_description, organization_name, organization_logo, donor_count
*/

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create campaigns table with all fields
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  title text NOT NULL,
  description text NOT NULL,
  full_description text,
  image_url text,
  
  -- Donation Details
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  end_date date,
  
  -- Location
  target_location text,
  gmaps_link text,
  
  -- Form Settings
  form_type text DEFAULT 'donation' CHECK (form_type IN ('donation', 'zakat')),
  display_format text DEFAULT 'card' CHECK (display_format IN ('card', 'list', 'typing', 'package', 'package2')),
  campaign_type text,
  preset_amounts jsonb DEFAULT '[]'::jsonb,
  
  -- Status and Category
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  
  -- User and Organization
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name text DEFAULT 'Donasiku',
  organization_logo text,
  
  -- Metadata
  is_urgent boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  donor_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_category_id ON campaigns(category_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;

-- RLS Policies for campaigns
-- Public can view published campaigns
CREATE POLICY "Public can view published campaigns"
  ON campaigns FOR SELECT
  USING (status = 'published');

-- Users can view their own campaigns (including drafts)
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

-- RLS Policies for categories (public read)
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- Insert default categories if not exist
INSERT INTO categories (name, slug, icon, description)
VALUES
  ('Infaq', 'infaq', 'heart', 'Bantu sesama dengan infaq'),
  ('Sedekah', 'sedekah', 'hand-heart', 'Sedekah untuk yang membutuhkan'),
  ('Wakaf', 'wakaf', 'building', 'Wakaf untuk kebaikan berkelanjutan'),
  ('Zakat', 'zakat', 'coins', 'Tunaikan zakat Anda')
ON CONFLICT (slug) DO NOTHING;

