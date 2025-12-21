-- Add amen_count to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amen_count INTEGER DEFAULT 0;

-- Add amen_count to testimonials table
ALTER TABLE testimonials 
ADD COLUMN IF NOT EXISTS amen_count INTEGER DEFAULT 0;

-- Create RPC function to safely increment amen count
CREATE OR REPLACE FUNCTION increment_amen(row_id UUID, is_transaction BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF is_transaction THEN
    UPDATE transactions 
    SET amen_count = COALESCE(amen_count, 0) + 1 
    WHERE id = row_id;
  ELSE
    UPDATE testimonials 
    SET amen_count = COALESCE(amen_count, 0) + 1 
    WHERE id = row_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION increment_amen(UUID, BOOLEAN) TO anon, authenticated, service_role;
