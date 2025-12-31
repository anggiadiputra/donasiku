-- MIGRATION: ADD VERIFICATION STATUS TO ORGANIZATIONS
-- Description: Adds a verification_status column to the organizations table, referencing the existing enum.

-- 1. Add verification_status column to organizations
-- We use the existing 'verification_status' type created in a previous migration.
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified';

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_verification_status ON public.organizations(verification_status);

-- 3. Comment for clarity
COMMENT ON COLUMN public.organizations.verification_status IS 'Status verifikasi organisasi (unverified, pending, verified, rejected)';

-- 4. Backfill existing organizations (optional, they default to unverified anyway)
-- UPDATE public.organizations SET verification_status = 'unverified' WHERE verification_status IS NULL;

-- 5. AUTO-VERIFY PLATFORM OWNERS (SUPREME ADMINS)
-- Any profile with the role 'admin' should be verified automatically for database stability
UPDATE public.profiles
SET verification_status = 'verified'
WHERE role = 'admin' AND verification_status != 'verified';

-- 6. AUTO-VERIFY ADMIN ORGANIZATIONS
-- Any organization that has at least one member with the 'admin' profile role should be verified
UPDATE public.organizations
SET verification_status = 'verified'
WHERE id IN (
    SELECT organization_id 
    FROM public.organization_members om
    JOIN public.profiles p ON om.user_id = p.id
    WHERE p.role = 'admin'
) AND verification_status != 'verified';
