-- Add is_anonymous column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Update existing anonymous transactions if any (based on customer_name)
UPDATE transactions 
SET is_anonymous = true 
WHERE customer_name IN ('Hamba Allah', 'Orang Baik') 
AND is_anonymous = false;
