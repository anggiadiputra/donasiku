-- Create payment_methods table for managing Duitku payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Duitku payment method info
  payment_method_code text UNIQUE NOT NULL, -- e.g., 'BC', 'M2', 'OV'
  payment_method_name text NOT NULL, -- e.g., 'BCA Virtual Account'
  payment_image text, -- Logo URL from Duitku
  
  -- Fee information
  total_fee text, -- Fee string from Duitku (e.g., '4000' or '2.5%')
  
  -- Category for grouping
  category text, -- 'virtual_account', 'e_wallet', 'qris', 'credit_card', 'retail', 'paylater', 'e_banking'
  
  -- Status & Settings
  is_active boolean DEFAULT true, -- Admin can enable/disable
  sort_order integer DEFAULT 0, -- For custom ordering
  
  -- Metadata
  metadata jsonb, -- Store additional info from Duitku
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now() -- Last sync from Duitku API
);

-- Create index for active payment methods
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active, sort_order);
CREATE INDEX idx_payment_methods_category ON payment_methods(category);
CREATE INDEX idx_payment_methods_code ON payment_methods(payment_method_code);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view active payment methods
CREATE POLICY "Anyone can view active payment methods"
  ON payment_methods FOR SELECT
  USING (is_active = true);

-- Authenticated users can view all payment methods (for admin)
CREATE POLICY "Authenticated users can view all payment methods"
  ON payment_methods FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can insert/update payment methods
CREATE POLICY "Authenticated users can manage payment methods"
  ON payment_methods FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Grant permissions
GRANT ALL ON payment_methods TO authenticated;
GRANT SELECT ON payment_methods TO anon;
