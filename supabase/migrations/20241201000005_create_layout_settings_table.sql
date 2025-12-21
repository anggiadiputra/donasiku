/*
  # Create Layout Settings Table
  
  This migration creates the layout_settings table to store home page/landing page layout configuration.
  
  Fields:
  - hero_slider_enabled: Enable/disable hero slider
  - hero_slider_items: JSON array of slider items (image, title, subtitle, button_text, button_link)
  - program_mendadak_enabled: Enable/disable Program Mendadak section
  - program_mendadak_title: Title for Program Mendadak section
  - program_mendadak_description: Description for Program Mendadak section
  - program_mendadak_image: Image URL for Program Mendadak
  - campaign_list_layout: Layout type ('list' or 'grid')
  - campaign_list_enabled: Enable/disable campaign list section
  - footer_enabled: Enable/disable footer
  - footer_content: JSON object with footer content (links, social media, etc.)
  - updated_at: Last update timestamp
*/

CREATE TABLE IF NOT EXISTS layout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hero Slider Settings
  hero_slider_enabled boolean DEFAULT true,
  hero_slider_items jsonb DEFAULT '[]'::jsonb,
  
  -- Program Mendadak Settings
  program_mendadak_enabled boolean DEFAULT true,
  program_mendadak_title text DEFAULT 'Program Mendadak',
  program_mendadak_description text,
  program_mendadak_image text,
  program_mendadak_button_text text DEFAULT 'Donasi Sekarang',
  program_mendadak_button_link text DEFAULT '/donasi',
  
  -- Campaign List Settings
  campaign_list_enabled boolean DEFAULT true,
  campaign_list_layout text DEFAULT 'list' CHECK (campaign_list_layout IN ('list', 'grid')),
  campaign_list_title text DEFAULT 'Rekomendasi',
  campaign_list_limit integer DEFAULT 10,
  
  -- Footer Settings
  footer_enabled boolean DEFAULT true,
  footer_content jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_layout_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_layout_settings_updated_at ON layout_settings;
CREATE TRIGGER update_layout_settings_updated_at
  BEFORE UPDATE ON layout_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_layout_settings_updated_at();

-- Enable RLS
ALTER TABLE layout_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view layout settings"
  ON layout_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can update settings
CREATE POLICY "Authenticated users can update layout settings"
  ON layout_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert layout settings"
  ON layout_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Insert default settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM layout_settings LIMIT 1) THEN
    INSERT INTO layout_settings (
      hero_slider_enabled,
      hero_slider_items,
      program_mendadak_enabled,
      campaign_list_enabled,
      campaign_list_layout,
      footer_enabled
    )
    VALUES (
      true,
      '[
        {
          "image": "https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg",
          "title": "Saatnya Sejuta",
          "subtitle": "BANTU HIDUP ANAK TERLANTAR",
          "description": "Bantuan dari 250.000 orang/bulan yang akan berulang terus dan terus setiap bulannya",
          "buttonText": "Donasi Sekarang",
          "buttonLink": "/donasi"
        }
      ]'::jsonb,
      true,
      true,
      'list',
      true
    );
  END IF;
END $$;

