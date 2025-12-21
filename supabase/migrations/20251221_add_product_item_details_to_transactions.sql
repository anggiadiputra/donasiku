ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS product_details TEXT,
ADD COLUMN IF NOT EXISTS item_details JSONB;
