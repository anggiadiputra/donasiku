/*
  # Create Zakat Settings Table
  
  This migration creates the zakat_settings table to store Zakat calculation rules and settings.
  
  Fields:
  - gold_price_per_gram: Current gold price per gram (for nishab calculation)
  - nishab_gold_grams: Amount of gold in grams for nishab (default 85)
  - zakat_percentage: Zakat percentage (default 2.5% = 0.025)
  - calculation_note: Note about calculation method
  - updated_at: Last update timestamp
*/

CREATE TABLE IF NOT EXISTS zakat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Gold Price Settings
  gold_price_per_gram numeric(15, 2) DEFAULT 1347143.00,
  nishab_gold_grams numeric(10, 2) DEFAULT 85.00,
  
  -- Zakat Calculation
  zakat_percentage numeric(5, 4) DEFAULT 0.025, -- 2.5%
  
  -- Information
  calculation_note text,
  gold_price_source text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zakat_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_zakat_settings_updated_at ON zakat_settings;
CREATE TRIGGER update_zakat_settings_updated_at
  BEFORE UPDATE ON zakat_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_zakat_settings_updated_at();

-- Enable RLS
ALTER TABLE zakat_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view zakat settings"
  ON zakat_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can update settings
CREATE POLICY "Authenticated users can update zakat settings"
  ON zakat_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert zakat settings"
  ON zakat_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Public can view zakat settings (for calculation)
CREATE POLICY "Public can view zakat settings"
  ON zakat_settings FOR SELECT
  USING (true);

-- Insert default settings (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM zakat_settings LIMIT 1) THEN
    INSERT INTO zakat_settings (
      gold_price_per_gram,
      nishab_gold_grams,
      zakat_percentage,
      calculation_note,
      gold_price_source
    )
    VALUES (
      1347143.00,
      85.00,
      0.025,
      'Perhitungan zakat mengacu pada pendapat Dewan Syariah Rumah Zakat. Perhitungan berdasarkan prediksi rata-rata harga emas dari Januari hingga Agustus 2025 yang bersumber dari Raja Emas Indonesia dan Laku Emas.',
      'Raja Emas Indonesia dan Laku Emas'
    );
  END IF;
END $$;

