-- MIGRATION: ADD DESCRIPTION AND LOCATION TO ORGANIZATIONS
-- Allowing organizations to have custom bio and location info.

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS description text DEFAULT 'Wadah kolaborasi kebaikan untuk Indonesia yang lebih baik. Mari bersama-sama menebar manfaat melalui berbagai program kami.',
ADD COLUMN IF NOT EXISTS location text DEFAULT 'Indonesia';
