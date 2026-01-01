-- Update campaigner_stats_view to include full_name
-- Missing full_name caused Edit Modal to show empty Personal Name.

-- We must DROP first because we are changing column structure (inserting full_name)
DROP VIEW IF EXISTS campaigner_stats_view;

CREATE OR REPLACE VIEW campaigner_stats_view AS

-- 1. Organization Members
SELECT
    m.user_id,
    p.email,
    p.full_name, -- Added
    COALESCE(o.name, p.organization_name, 'Individual') as organization_name,
    p.phone as phone_number,
    p.verification_status,
    COALESCE(o.verification_status, 'unverified') as org_verification_status,
    p.bio,
    p.role,
    m.organization_id,
    m.created_at as joined_at,
    
    -- Stats
    (
        SELECT COUNT(*)
        FROM campaigns c
        WHERE c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id)
    ) as total_campaigns,
    
    (
        SELECT COUNT(*)
        FROM campaigns c
        WHERE (c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id)) 
        AND c.status = 'published'
    ) as active_campaigns,
    
    (
        SELECT COALESCE(SUM(current_amount), 0)
        FROM campaigns c
        WHERE c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id)
    ) as total_raised,

    (
        SELECT COALESCE(SUM(target_amount), 0)
        FROM campaigns c
        WHERE c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id)
    ) as total_target,
    
    -- Donors
    (
        SELECT COUNT(DISTINCT COALESCE(t.customer_email, t.customer_phone))
        FROM transactions t
        JOIN campaigns c ON c.id = t.campaign_id
        WHERE (c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id))
        AND t.status = 'success'
    ) as total_donors,

    -- Dates
    (
        SELECT MIN(c.created_at)
        FROM campaigns c
        WHERE c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id)
    ) as first_campaign_date,
    
    (
        SELECT MAX(c.created_at)
        FROM campaigns c
        WHERE c.user_id = m.user_id OR (m.organization_id IS NOT NULL AND c.organization_id = m.organization_id)
    ) as last_campaign_date

FROM organization_members m
JOIN profiles p ON m.user_id = p.id
LEFT JOIN organizations o ON m.organization_id = o.id

UNION ALL

-- 2. Independent Campaigners
SELECT
    p.id as user_id,
    p.email,
    p.full_name, -- Added
    COALESCE(p.organization_name, 'Individual') as organization_name,
    p.phone as phone_number,
    p.verification_status,
    'unverified' as org_verification_status,
    p.bio,
    p.role,
    NULL::uuid as organization_id,
    p.created_at as joined_at,
    
    -- Stats
    (
        SELECT COUNT(*) 
        FROM campaigns c 
        WHERE c.user_id = p.id
    ) as total_campaigns,
    
    (
        SELECT COUNT(*) 
        FROM campaigns c 
        WHERE c.user_id = p.id AND c.status = 'published'
    ) as active_campaigns,
    
    (
        SELECT COALESCE(SUM(current_amount), 0) 
        FROM campaigns c 
        WHERE c.user_id = p.id
    ) as total_raised,

    (
        SELECT COALESCE(SUM(target_amount), 0) 
        FROM campaigns c 
        WHERE c.user_id = p.id
    ) as total_target,
    
    (
        SELECT COUNT(DISTINCT COALESCE(t.customer_email, t.customer_phone))
        FROM transactions t
        JOIN campaigns c ON c.id = t.campaign_id
        WHERE c.user_id = p.id AND t.status = 'success'
    ) as total_donors,

    (
        SELECT MIN(c.created_at) 
        FROM campaigns c 
        WHERE c.user_id = p.id
    ) as first_campaign_date,
    
    (
        SELECT MAX(c.created_at) 
        FROM campaigns c 
        WHERE c.user_id = p.id
    ) as last_campaign_date

FROM profiles p
WHERE p.id IN (SELECT DISTINCT user_id FROM campaigns)
AND p.id NOT IN (SELECT user_id FROM organization_members);
