DO $$
DECLARE
    target_org_id UUID;
    new_owner_id UUID;
BEGIN
    -- 1. Find the Organization 'Kamu Bisa'
    SELECT id INTO target_org_id FROM organizations WHERE name ILIKE '%Kamu Bisa%' LIMIT 1;
    
    -- 2. Find the New Owner (Arie Selvian)
    SELECT id INTO new_owner_id FROM profiles WHERE email = 'selvian.site@gmail.com';

    IF target_org_id IS NOT NULL AND new_owner_id IS NOT NULL THEN
        -- 3. Update Organization Owner
        UPDATE organizations 
        SET owner_id = new_owner_id
        WHERE id = target_org_id;

        -- 4. Ensure New Owner is in organization_members
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (target_org_id, new_owner_id, 'owner')
        ON CONFLICT (organization_id, user_id) 
        DO UPDATE SET role = 'owner';

        -- 5. Remove 'sini@diurusin.id' (Super Admin) from members of this org if they exists
        --    This ensures separation so Admin doesn't see it as "My Org" in dashboard context, 
        --    but still sees it in Global View.
        DELETE FROM organization_members 
        WHERE organization_id = target_org_id 
        AND user_id IN (SELECT id FROM profiles WHERE email = 'sini@diurusin.id');

        RAISE NOTICE 'Ownership transferred successfully to %', new_owner_id;
    ELSE
        RAISE WARNING 'Org or User not found. Org: %, User: %', target_org_id, new_owner_id;
    END IF;
END $$;
