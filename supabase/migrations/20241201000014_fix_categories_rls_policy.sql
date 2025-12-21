/*
  # Fix Categories RLS Policy for INSERT
  
  This migration adds INSERT policy for authenticated users to add categories.
*/

-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

