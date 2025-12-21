/*
  # Add program_mendadak_items to layout_settings
  
  This migration adds a program_mendadak_items field to store multiple program items
  with icon, name, and URL for each program (Infaq, Sedekah, Wakaf, Zakat).
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'layout_settings' AND column_name = 'program_mendadak_items') THEN
    ALTER TABLE layout_settings ADD COLUMN program_mendadak_items jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

