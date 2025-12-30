-- FIX PROFILES TRIGGER AND DATA
-- This script ensures full_name and avatar_url are never NULL by using fallbacks.

-- 1. Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    fallback_name TEXT;
    avatar TEXT;
BEGIN
    -- Fallback name: part of email before @
    fallback_name := split_part(NEW.email, '@', 1);
    
    -- Try to find avatar in metadata
    avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        'https://ui-avatars.com/api/?name=' || encode(fallback_name::bytea, 'escape') || '&background=random'
    );

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            initcap(fallback_name) -- e.g. "sini" become "Sini"
        ),
        avatar,
        COALESCE(NEW.raw_user_meta_data->>'role', 'campaigner')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        email = EXCLUDED.email;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Sync existing users who have NULL values
DO $$
DECLARE
    r RECORD;
    fallback_name TEXT;
BEGIN
    FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        fallback_name := split_part(r.email, '@', 1);
        
        UPDATE public.profiles
        SET 
            full_name = COALESCE(
                profiles.full_name,
                r.raw_user_meta_data->>'full_name',
                r.raw_user_meta_data->>'name',
                initcap(fallback_name)
            ),
            avatar_url = COALESCE(
                profiles.avatar_url,
                r.raw_user_meta_data->>'avatar_url',
                r.raw_user_meta_data->>'picture',
                'https://ui-avatars.com/api/?name=' || fallback_name || '&background=random'
            )
        WHERE profiles.id = r.id
        AND (full_name IS NULL OR avatar_url IS NULL);
    END LOOP;
END $$;

-- 3. Add NOT NULL constraints if desired (optional, but good for enforcement)
-- Only do this if we are sure all current data is filled.
-- ALTER TABLE profiles ALTER COLUMN full_name SET NOT NULL;
