-- Add campaign slider configuration to layout_settings

ALTER TABLE layout_settings 
ADD COLUMN IF NOT EXISTS campaign_slider_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS campaign_slider_title TEXT DEFAULT 'Pilihan Donasiku',
ADD COLUMN IF NOT EXISTS campaign_slider_ids JSONB DEFAULT '[]'::jsonb;
