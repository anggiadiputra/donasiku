-- Add customer_message column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS customer_message text;

-- Add comment
COMMENT ON COLUMN transactions.customer_message IS 'Message or prayer from the donor';
