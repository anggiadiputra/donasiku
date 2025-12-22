-- Add CTA button customization fields to layout_settings
ALTER TABLE layout_settings
ADD COLUMN IF NOT EXISTS cta_primary_label TEXT DEFAULT 'Donasi Sekarang',
ADD COLUMN IF NOT EXISTS cta_primary_link TEXT DEFAULT '/donasi',
ADD COLUMN IF NOT EXISTS cta_secondary_label TEXT DEFAULT 'Hubungi Admin',
ADD COLUMN IF NOT EXISTS cta_secondary_link TEXT DEFAULT 'https://wa.me/';

-- Add comment
COMMENT ON COLUMN layout_settings.cta_primary_label IS 'Label for the primary CTA button (e.g. Donasi Sekarang)';
COMMENT ON COLUMN layout_settings.cta_primary_link IS 'Link/Action for the primary CTA button';
COMMENT ON COLUMN layout_settings.cta_secondary_label IS 'Label for the secondary CTA button (e.g. Hubungi Admin)';
COMMENT ON COLUMN layout_settings.cta_secondary_link IS 'Link/Action for the secondary CTA button';
