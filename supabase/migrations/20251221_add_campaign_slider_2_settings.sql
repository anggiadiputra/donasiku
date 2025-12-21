-- Add configuration for second campaign slider to layout_settings

ALTER TABLE layout_settings 
ADD COLUMN IF NOT EXISTS campaign_slider_2_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS campaign_slider_2_title TEXT DEFAULT 'Pilihan Donasiku',
ADD COLUMN IF NOT EXISTS campaign_slider_2_ids JSONB DEFAULT '[]'::jsonb;
