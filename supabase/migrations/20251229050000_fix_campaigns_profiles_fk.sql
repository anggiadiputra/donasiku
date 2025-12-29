-- Fix foreign key relationship for PostgREST embedding
-- This allows performing joins between campaigns and profiles tables

-- Drop existing FK to auth.users if needed (optional, keeping it is usually fine but might cause ambiguity)
-- However, for PostgREST resource embedding 'profiles', we specifically need FK to public.profiles.

BEGIN;

-- Add foreign key to public.profiles
-- We use ON DELETE CASCADE to clean up campaigns if profile/user is deleted
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_user_id_fkey,
  ADD CONSTRAINT campaigns_user_id_fkey_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMIT;
