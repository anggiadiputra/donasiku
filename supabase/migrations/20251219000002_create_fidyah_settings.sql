-- Create fidyah_settings table
CREATE TABLE IF NOT EXISTS fidyah_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_title TEXT NOT NULL DEFAULT 'Fidyah',
  program_subtitle TEXT,
  program_description TEXT,
  program_image TEXT,
  price_per_day NUMERIC NOT NULL DEFAULT 45000,
  target_campaign_id UUID REFERENCES campaigns(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fidyah_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON fidyah_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update access" ON fidyah_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access" ON fidyah_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
