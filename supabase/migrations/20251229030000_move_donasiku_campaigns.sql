
-- Update campaigns that belong to 'Donasiku' (user_id IS NULL) to 'Mr. Adi Putra' (2bbb66aa-d29b-4367-81c5-85bce9d4fe7b)
-- Also ensuring we target campaigns that appear as Donasiku.

UPDATE public.campaigns
SET user_id = '2bbb66aa-d29b-4367-81c5-85bce9d4fe7b'
WHERE user_id IS NULL 
  AND organization_name ILIKE '%Donasiku%';

-- Optional: You might want to update organization_name in campaigns table too, 
-- but the UI seems to prefer Profile name, so might not be strictly necessary 
-- unless 'organization_name' column in campaigns is intended to be a snapshot.
-- Let's leave it as is for now to avoid losing historical context if any.
