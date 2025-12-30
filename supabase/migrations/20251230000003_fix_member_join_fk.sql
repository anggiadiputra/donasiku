-- FIX ORGANIZATION MEMBERS JOIN
-- This script adds a foreign key from organization_members to profiles to enable PostgREST joins.

ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_user_id_profiles_fkey;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also ensured created_at is used instead of joined_at (already handled in frontend but good for consistency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_members' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE organization_members RENAME COLUMN joined_at TO created_at;
    END IF;
EXCEPTION
    WHEN undefined_column THEN
        -- Column joined_at doesn't exist, which is fine if created_at is already there
        NULL;
END $$;
