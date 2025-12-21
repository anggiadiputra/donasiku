/*
  # Create Infaq Settings Table
  
  This migration creates the infaq_settings table to store Infaq program settings.
  
  Fields:
  - program_title: Title of the infaq program
  - program_description: Full description of the program
  - program_image: Main image URL
  - preset_amounts: JSON array of preset donation amounts
  - default_amount: Default donation amount
  - note_text: Additional note or information
  - updated_at: Last update timestamp
*/

CREATE TABLE IF NOT EXISTS infaq_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Program Information
  program_title text DEFAULT 'SEDEKAH MU',
  program_subtitle text,
  program_description text,
  program_image text,
  
  -- Donation Settings
  preset_amounts jsonb DEFAULT '[25000, 50000, 100000, 250000]'::jsonb,
  default_amount numeric(15, 2) DEFAULT 125000.00,
  
  -- Additional Information
  note_text text,
  quran_verse text,
  quran_reference text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_infaq_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_infaq_settings_updated_at ON infaq_settings;
CREATE TRIGGER update_infaq_settings_updated_at
  BEFORE UPDATE ON infaq_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_infaq_settings_updated_at();

-- Enable RLS
ALTER TABLE infaq_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view infaq settings"
  ON infaq_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can update settings
CREATE POLICY "Authenticated users can update infaq settings"
  ON infaq_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert infaq settings"
  ON infaq_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Public can view infaq settings (for display)
CREATE POLICY "Public can view infaq settings"
  ON infaq_settings FOR SELECT
  USING (true);

-- Insert default settings (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM infaq_settings LIMIT 1) THEN
    INSERT INTO infaq_settings (
      program_title,
      program_subtitle,
      program_description,
      preset_amounts,
      default_amount,
      note_text,
      quran_verse,
      quran_reference
    )
    VALUES (
      'SEDEKAH MU',
      'Wujud Keimanan Pada Allah Semata dan Kepedulian Untuk Sesama',
      'Sedekah adalah salah satu amalan yang sangat mulia dalam Islam. Melalui sedekah, kita tidak hanya membantu sesama yang membutuhkan, tetapi juga membersihkan harta dan mendekatkan diri kepada Allah SWT.',
      '[25000, 50000, 100000, 250000]'::jsonb,
      125000.00,
      'Setiap rupiah yang kita sedekahkan akan menjadi amal jariyah yang pahalanya terus mengalir, bahkan setelah kita meninggal dunia.',
      'Yaitu mereka yang beriman kepada yang gaib, mendirikan salat, dan menginfakkan sebagian rezeki yang Kami berikan kepada mereka.',
      'QS. Al-Baqarah: 3'
    );
  END IF;
END $$;

