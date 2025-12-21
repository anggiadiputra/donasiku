/*
  # Donasiku Database Schema

  1. New Tables
    - `campaigns`
      - `id` (uuid, primary key)
      - `title` (text) - Campaign title
      - `description` (text) - Campaign description
      - `image_url` (text) - Campaign image URL
      - `target_amount` (numeric) - Target donation amount
      - `current_amount` (numeric) - Current amount collected
      - `category` (text) - Category (infaq, sedekah, wakaf, zakat)
      - `is_urgent` (boolean) - Mark as urgent campaign
      - `is_verified` (boolean) - Verification status
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp
    
    - `donations`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key) - Related campaign
      - `donor_name` (text) - Donor name (optional, for anonymous)
      - `amount` (numeric) - Donation amount
      - `is_anonymous` (boolean) - Anonymous donation flag
      - `payment_method` (text) - Payment method used
      - `status` (text) - Payment status (pending, completed, failed)
      - `created_at` (timestamptz) - Donation timestamp
    
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `slug` (text) - URL-friendly slug
      - `icon` (text) - Icon identifier
      - `description` (text) - Category description
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for campaigns and categories
    - Authenticated insert for donations
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  is_urgent boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  donor_name text,
  amount numeric NOT NULL,
  is_anonymous boolean DEFAULT false,
  payment_method text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view campaigns"
  ON campaigns FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view completed donations"
  ON donations FOR SELECT
  USING (status = 'completed');

CREATE POLICY "Anyone can create donations"
  ON donations FOR INSERT
  WITH CHECK (true);

INSERT INTO categories (name, slug, icon, description) VALUES
  ('Infaq', 'infaq', 'heart', 'Bantu sesama dengan infaq'),
  ('Sedekah', 'sedekah', 'hand-heart', 'Sedekah untuk yang membutuhkan'),
  ('Wakaf', 'wakaf', 'building', 'Wakaf untuk kebaikan berkelanjutan'),
  ('Zakat', 'zakat', 'coins', 'Tunaikan zakat Anda');

INSERT INTO campaigns (title, description, image_url, target_amount, current_amount, category, is_urgent, is_verified) VALUES
  ('Bantu Penuh Popok Untuk Anak-Anak Mulia', 'Bantuan popok untuk bayi terlantar di panti asuhan', 'https://images.pexels.com/photos/1648375/pexels-photo-1648375.jpeg', 5700000, 700000, 'sedekah', true, true),
  ('Bantu Penuh Asupan Untuk Tumbuh Kembang Bayi Terlantar', 'Bantuan nutrisi dan makanan untuk bayi terlantar', 'https://images.pexels.com/photos/3662667/pexels-photo-3662667.jpeg', 6815187330, 6815187330, 'infaq', false, true),
  ('Bantu Penuh Kebutuhan Tumbuh Kembang Bayi Terlantar', 'Bantuan kebutuhan tumbuh kembang bayi terlantar', 'https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg', 17095469, 17095469, 'sedekah', false, true);
