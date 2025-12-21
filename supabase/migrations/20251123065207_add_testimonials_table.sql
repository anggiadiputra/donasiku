/*
  # Create testimonials table

  1. New Tables
    - `testimonials`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key) - Related campaign
      - `donor_name` (text) - Name of the testimonial giver
      - `message` (text) - Testimonial message
      - `created_at` (timestamptz) - Creation timestamp
  2. Security
    - Enable RLS on testimonials table
    - Anyone can view testimonials
    - Anyone can create testimonials
*/

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonials"
  ON testimonials FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create testimonials"
  ON testimonials FOR INSERT
  WITH CHECK (true);

INSERT INTO testimonials (campaign_id, donor_name, message) VALUES
  ((SELECT id FROM campaigns WHERE title LIKE '%Popok%' LIMIT 1), 'Hamba Allah', 'Sehat selalu ya adek-adek kecil'),
  ((SELECT id FROM campaigns WHERE title LIKE '%Popok%' LIMIT 1), 'Orang Baik', 'Semoga Alloh membalas kebaikan kalian dengan kesehatan dan kesuksesan dunia dan akhirat'),
  ((SELECT id FROM campaigns WHERE title LIKE '%Asupan%' LIMIT 1), 'Reynaldo Fiduanta Adi Putra', 'Semoga kuliah saya kuliah diakhiri kesekatan-kesuksesan dan terima kasih atas bantuan ini'),
  ((SELECT id FROM campaigns WHERE title LIKE '%Asupan%' LIMIT 1), 'Orang Baik', 'Semoga anak-anak dapat mendapat kasih sayang yang sempurna'),
  ((SELECT id FROM campaigns WHERE title LIKE '%Tumbuh Kembang%' LIMIT 1), 'Orang Baik', 'Semoga adek-adek tumbuh menjadi orang yang berguna bagi agama dan bangsanya');
