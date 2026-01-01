-- Ensure columns exist before creating the view
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zakat_fee NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

DROP VIEW IF EXISTS campaigner_stats_view;

CREATE OR REPLACE VIEW campaigner_stats_view AS
WITH campaigner_profiles AS (
    -- All members of any organization
    SELECT 
        m.user_id,
        m.organization_id,
        m.created_at as joined_at,
        'member' as source
    FROM organization_members m
    
    UNION ALL
    
    -- Independent campaigners (those with campaigns who are NOT in any organization)
    SELECT 
        p.id as user_id,
        NULL::uuid as organization_id,
        p.created_at as joined_at,
        'independent' as source
    FROM profiles p
    WHERE p.id IN (SELECT DISTINCT user_id FROM campaigns)
    AND p.id NOT IN (SELECT user_id FROM organization_members)
)
SELECT
    cp.user_id,
    p.email,
    p.full_name,
    COALESCE(o.name, p.organization_name, 'Individual') as organization_name,
    p.phone as phone_number,
    p.verification_status,
    COALESCE(o.verification_status, 'unverified') as org_verification_status,
    p.bio,
    p.role,
    cp.organization_id,
    cp.joined_at,
    -- Fees
    COALESCE(o.platform_fee, p.platform_fee, 0) as platform_fee,
    COALESCE(o.zakat_fee, 0) as zakat_fee,
    
    -- Stats
    (
        SELECT COUNT(*)
        FROM campaigns c
        WHERE c.user_id = cp.user_id 
           OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id)
    ) as total_campaigns,
    
    (
        SELECT COUNT(*)
        FROM campaigns c
        WHERE (c.user_id = cp.user_id OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id)) 
        AND c.status = 'published'
    ) as active_campaigns,
    
    (
        SELECT COALESCE(SUM(current_amount), 0)
        FROM campaigns c
        WHERE c.user_id = cp.user_id OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id)
    ) as total_raised,

    (
        SELECT COALESCE(SUM(target_amount), 0)
        FROM campaigns c
        WHERE c.user_id = cp.user_id OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id)
    ) as total_target,
    
    -- Donors
    (
        SELECT COUNT(DISTINCT COALESCE(t.customer_email, t.customer_phone))
        FROM transactions t
        JOIN campaigns c ON c.id = t.campaign_id
        WHERE (c.user_id = cp.user_id OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id))
        AND t.status = 'success'
    ) as total_donors,

    -- Dates
    (
        SELECT MIN(c.created_at)
        FROM campaigns c
        WHERE c.user_id = cp.user_id OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id)
    ) as first_campaign_date,
    
    (
        SELECT MAX(c.created_at)
        FROM campaigns c
        WHERE c.user_id = cp.user_id OR (cp.organization_id IS NOT NULL AND c.organization_id = cp.organization_id)
    ) as last_campaign_date

FROM campaigner_profiles cp
JOIN profiles p ON cp.user_id = p.id
LEFT JOIN organizations o ON cp.organization_id = o.id;
