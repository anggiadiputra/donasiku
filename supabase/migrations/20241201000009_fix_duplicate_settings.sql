/*
  # Fix Duplicate Settings Issue
  
  This migration ensures only one record exists in layout_settings and app_settings tables.
  It deletes duplicates and keeps only the most recent one.
*/

-- Fix layout_settings: Keep only the most recent record
DO $$
DECLARE
  record_count INTEGER;
  latest_id UUID;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO record_count FROM layout_settings;
  
  -- If more than one record, keep only the latest
  IF record_count > 1 THEN
    SELECT id INTO latest_id 
    FROM layout_settings 
    ORDER BY updated_at DESC, created_at DESC 
    LIMIT 1;
    
    -- Delete all except the latest
    DELETE FROM layout_settings WHERE id != latest_id;
    
    RAISE NOTICE 'Removed duplicate layout_settings records. Kept record with id: %', latest_id;
  END IF;
END $$;

-- Fix app_settings: Keep only the most recent record
DO $$
DECLARE
  record_count INTEGER;
  latest_id UUID;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO record_count FROM app_settings;
  
  -- If more than one record, keep only the latest
  IF record_count > 1 THEN
    SELECT id INTO latest_id 
    FROM app_settings 
    ORDER BY updated_at DESC, created_at DESC 
    LIMIT 1;
    
    -- Delete all except the latest
    DELETE FROM app_settings WHERE id != latest_id;
    
    RAISE NOTICE 'Removed duplicate app_settings records. Kept record with id: %', latest_id;
  END IF;
END $$;

