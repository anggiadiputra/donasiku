ALTER TABLE layout_settings 
ADD COLUMN IF NOT EXISTS promo_slider_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promo_slider_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cta_slider_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cta_slider_items JSONB DEFAULT '[]'::jsonb;
