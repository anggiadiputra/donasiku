-- Migration: Add verification and profile details to profiles table
-- Description: Adds verification_status, bio, and social_links to the profiles table.

-- 1. Create verification_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
    END IF;
END$$;

-- 2. Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 3. Create index for verification_status
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- 4. Update RLS policies (if needed, but profiles are already viewable)
-- Users should be able to update their bio and social_links, but NOT verification_status.
-- However, standard RLS is usually either ALL or nothing. 
-- In the UI, we will ensure verification_status is not editable by the user.

COMMENT ON COLUMN public.profiles.verification_status IS 'Status verifikasi akun (unverified, pending, verified, rejected)';
COMMENT ON COLUMN public.profiles.bio IS 'Biografi singkat campaigner';
COMMENT ON COLUMN public.profiles.social_links IS 'Tautan media sosial (Instagram, Facebook, etc.) dalam format JSON';
