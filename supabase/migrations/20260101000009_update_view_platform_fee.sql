DROP VIEW IF EXISTS campaigner_stats_view;

CREATE OR REPLACE VIEW campaigner_stats_view AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.phone as phone_number,
    p.verification_status,
    p.bio,
    p.created_at as joined_at,
    -- Roles logic
    p.role,
    -- Organization logic
    o.id as organization_id,
    COALESCE(o.name, p.organization_name) as organization_name,
    o.verification_status as org_verification_status,
    -- Fee logic: Prefer Organization fee, fallback to Profile fee
    COALESCE(o.platform_fee, p.platform_fee, 0) as platform_fee,
    -- Aggregated Stats
    COUNT(DISTINCT c.id) as total_campaigns,
    COUNT(DISTINCT CASE WHEN c.status = 'published' THEN c.id END) as active_campaigns,
    COALESCE(SUM(c.current_amount), 0) as total_raised,
    COALESCE(SUM(c.target_amount), 0) as total_target,
    -- Donors count approximation (distinct phone/email from success transactions)
    (
        SELECT COUNT(DISTINCT t.customer_phone)
        FROM transactions t
        WHERE t.campaign_id IN (SELECT id FROM campaigns WHERE user_id = p.id)
        AND t.status = 'success'
    ) as total_donors,
    -- Dates
    MIN(c.created_at) as first_campaign_date,
    MAX(c.created_at) as last_campaign_date
FROM profiles p
LEFT JOIN organization_members m ON p.id = m.user_id
LEFT JOIN organizations o ON m.organization_id = o.id
LEFT JOIN campaigns c ON p.id = c.user_id
GROUP BY 
    p.id, p.email, p.full_name, p.phone, p.verification_status, p.bio, p.created_at, p.role, p.organization_name, p.platform_fee,
    o.id, o.name, o.verification_status, o.platform_fee;
