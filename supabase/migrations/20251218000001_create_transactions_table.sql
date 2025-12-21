-- Create transactions table for payment tracking
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order Information
  merchant_order_id text UNIQUE NOT NULL,
  invoice_code text UNIQUE NOT NULL,
  
  -- Transaction Details
  amount numeric NOT NULL,
  fee numeric DEFAULT 0,
  payment_method text NOT NULL,
  payment_method_name text,
  
  -- Duitku References
  duitku_reference text UNIQUE,
  va_number text,
  payment_url text,
  qr_string text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  result_code text,
  status_message text,
  
  -- Related Data
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Customer Information
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  
  -- Product Information
  product_details text,
  item_details jsonb,
  
  -- URLs
  callback_url text,
  return_url text,
  
  -- Timestamps
  expiry_time timestamptz,
  settlement_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Additional
  additional_param text,
  metadata jsonb
);

-- Create indexes for performance
CREATE INDEX idx_transactions_merchant_order_id ON transactions(merchant_order_id);
CREATE INDEX idx_transactions_invoice_code ON transactions(invoice_code);
CREATE INDEX idx_transactions_duitku_reference ON transactions(duitku_reference);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_campaign_id ON transactions(campaign_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_customer_email ON transactions(customer_email);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view their own transactions by email
CREATE POLICY "Users can view own transactions by email"
  ON transactions FOR SELECT
  USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email'
         OR auth.uid() = user_id);

-- Anyone can create transactions (for guest donations)
CREATE POLICY "Anyone can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id OR customer_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Grant permissions
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON transactions TO anon;
