-- Remove Arie Selvian from organization_members
DELETE FROM organization_members
WHERE user_id IN (
    SELECT id FROM profiles WHERE email = 'selvian.site@gmail.com'
);

-- Reset organization_name in profiles to be their own name or custom
UPDATE profiles
SET organization_name = 'Donasi Arie' -- Setting a temporary independent name
WHERE email = 'selvian.site@gmail.com';
