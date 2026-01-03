/*
  # Add Target Campaign to Settings Tables

  This migration adds a target_campaign_id column to both infaq_settings and zakat_settings tables.
  This allows these special pages to be linked to a backend campaign for managing updates and withdrawals.

  1. Changes
    - Add `target_campaign_id` (uuid, fk to campaigns) to `infaq_settings`
    - Add `target_campaign_id` (uuid, fk to campaigns) to `zakat_settings`
*/

-- Add target_campaign_id to infaq_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'infaq_settings' AND column_name = 'target_campaign_id'
  ) THEN
    ALTER TABLE infaq_settings
    ADD COLUMN target_campaign_id uuid REFERENCES campaigns(id);
  END IF;
END $$;

-- Add target_campaign_id to zakat_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zakat_settings' AND column_name = 'target_campaign_id'
  ) THEN
    ALTER TABLE zakat_settings
    ADD COLUMN target_campaign_id uuid REFERENCES campaigns(id);
  END IF;
END $$;
