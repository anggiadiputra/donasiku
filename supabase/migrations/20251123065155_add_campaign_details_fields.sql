/*
  # Add campaign details fields

  1. New Columns
    - `full_description` (text) - Full campaign description
    - `target_location` (text) - Location/address of the campaign
    - `organization_name` (text) - Organization running the campaign
    - `organization_logo` (text) - Organization logo URL
    - `is_verified` (boolean) - Verification status
  2. Modified Tables
    - Add fields to campaigns table for detailed campaign information
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'full_description'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN full_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'target_location'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN target_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'organization_name'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN organization_name text DEFAULT 'Donasiku';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'organization_logo'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN organization_logo text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'donor_count'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN donor_count integer DEFAULT 0;
  END IF;
END $$;

UPDATE campaigns SET
  full_description = 'Ulialah mata mereka. Di antara zasa dari tanggis khas bayi, ada kebutuhan pangan yang sangat mendesak. Termasuk kebutuhan fundamental yang sedang terancam di Yayasan Rumah Anak Surga. Popok Bayi adalah kebutuhan rutin setiap hari dan sangat penting untuk kesehatan dan kebersihan bayi.',
  target_location = 'Rumah Anak Surga, Banaran Gede, Bangsalwetan, Wetan, Kec. Karanc Lewas, Kab. Banyumas, Jawa Tengah 53157',
  organization_name = 'Rumah Anak Surga',
  donor_count = 1
WHERE title LIKE '%Popok%';

UPDATE campaigns SET
  full_description = 'Mereka adalah tunas-tunas masa depan, hamir saat ini, mereka sedang berkembang membesar dan menjadi generasi penerus. Lihat lah anak anak kami di Yayasan Rumah Anak Surga. Popok Bayi adalah kebutuhan fundamental yang sedang terancam di Yayasan Rumah Anak Surga. Mereka adalah tunas-tunas masa depan.',
  target_location = 'Rumah Anak Surga, Banaran Gede, Bangsalwetan, Wetan, Kec. Karanc Lewas, Kab. Banyumas, Jawa Tengah 53157',
  organization_name = 'Rumah Anak Surga',
  donor_count = 1
WHERE title LIKE '%Asupan%';

UPDATE campaigns SET
  full_description = 'Mereka adalah tunas-tunas masa depan, harim saat ini, mereka sedang berkembang membesar dan menjadi generasi penerus. Lihat lah anak anak kami di Yayasan Rumah Anak Surga. Mereka adalah tunas-tunas masa depan, harim saat ini, mereka sedang berkembang.',
  target_location = 'Rumah Anak Surga, Banaran Gede, Bangsalwetan, Wetan, Kec. Karanc Lewas, Kab. Banyumas, Jawa Tengah 53157',
  organization_name = 'Rumah Anak Surga',
  donor_count = 2
WHERE title LIKE '%Tumbuh Kembang%';
