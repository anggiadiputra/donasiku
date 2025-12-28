-- Migration to backfill is_anonymous column from metadata
-- This ensures that transactions created before the is_anonymous column was populated
-- are correctly marked as anonymous if the metadata indicates it.

UPDATE transactions
SET is_anonymous = true
WHERE 
  (is_anonymous IS NULL OR is_anonymous = false) 
  AND (
    -- Check for boolean true in jsonb
    (metadata->'is_anonymous')::text = 'true'
    OR
    -- Check for string "true" in jsonb
    metadata->>'is_anonymous' = 'true'
  );
