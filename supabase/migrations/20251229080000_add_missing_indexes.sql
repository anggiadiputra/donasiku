-- Add missing indexes for performance optimization
-- 1. Add covering index for fidyah_settings(target_campaign_id)
-- Resolves "Unindexed foreign keys" warning from Performance Advisor
CREATE INDEX IF NOT EXISTS idx_fidyah_settings_target_campaign_id ON public.fidyah_settings(target_campaign_id);

-- Note: Other "Unused Index" warnings were analyzed. 
-- Indexes on slugs, emails, and status columns are kept as they are 
-- essential for production lookups and sorting.
