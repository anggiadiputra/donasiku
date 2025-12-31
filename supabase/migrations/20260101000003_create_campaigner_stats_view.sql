-- Create a view to aggregate campaigner statistics
-- ensuring we capture data for both Organization Members and Independent Campaigners

CREATE OR REPLACE VIEW campaigner_stats_view AS

-- 1. Organization Members
-- Users who are linked to an organization via organization_members table.
-- Their campaigns include those they created (user_id) OR those belonging to their org (organization_id).
SELECT
    m.user_id,
    p.email,
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
    
    -- Donors (Count unique emails/phones from successful transactions)
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
-- Users who have campaigns but are NOT in organization_members
SELECT
    p.id as user_id,
    p.email,
    COALESCE(p.organization_name, 'Individual') as organization_name,
    p.phone as phone_number,
    p.verification_status,
    'unverified' as org_verification_status,
    p.bio,
    p.role,
    NULL::uuid as organization_id,
    p.created_at as joined_at,
    
    -- Stats (Only by user_id)
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
