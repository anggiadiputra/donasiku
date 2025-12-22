-- Add phone and organization_name fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Create index for organization_name for faster searches
CREATE INDEX IF NOT EXISTS profiles_organization_name_idx ON public.profiles(organization_name);

-- Update RLS policy to allow users to update their phone and organization_name
-- The existing "Users can update own profile" policy already covers this
