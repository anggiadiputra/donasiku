-- 1. Add fee columns to withdrawals table
ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Create Trigger Function to calculate fees
CREATE OR REPLACE FUNCTION calculate_withdrawal_fee()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign_category text;
    v_org_id uuid;
    v_user_id uuid;
    v_zakat_fee numeric := 0;
    v_platform_fee numeric := 0;
    v_fee_percentage numeric := 0;
BEGIN
    -- Get Campaign Details
    SELECT category, organization_id, user_id
    INTO v_campaign_category, v_org_id, v_user_id
    FROM campaigns
    WHERE id = NEW.campaign_id;

    -- Fetch Fees based on ownership
    IF v_org_id IS NOT NULL THEN
        -- Organization Campaign: Get fees from organizations table
        SELECT zakat_fee, platform_fee
        INTO v_zakat_fee, v_platform_fee
        FROM organizations
        WHERE id = v_org_id;
    ELSIF v_user_id IS NOT NULL THEN
        -- Independent Campaigner: Get fee from profiles table
        SELECT platform_fee
        INTO v_platform_fee
        FROM profiles
        WHERE id = v_user_id;
    END IF;

    -- Determine applicable fee
    -- Check for Zakat/Fidyah category (case insensitive)
    IF v_campaign_category ILIKE '%zakat%' OR v_campaign_category ILIKE '%fidyah%' THEN
        v_fee_percentage := COALESCE(v_zakat_fee, 0); -- Zakat (Amil) Fee
    ELSE
        -- Default to platform fee for verified/general donations
        v_fee_percentage := COALESCE(v_platform_fee, 0);
    END IF;

    -- Calculate Fee Amount (Operational/Zakat)
    IF v_fee_percentage > 0 THEN
        NEW.fee_amount := ROUND(NEW.amount * (v_fee_percentage / 100));
    ELSE
        NEW.fee_amount := 0;
    END IF;

    -- Ensure Bank Fee is 0 if null (can be set by admin later or passed in insert)
    NEW.bank_fee := COALESCE(NEW.bank_fee, 0);

    -- Calculate Net Amount
    NEW.net_amount := NEW.amount - NEW.fee_amount - NEW.bank_fee;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_calculate_withdrawal_fee ON withdrawals;
CREATE TRIGGER trigger_calculate_withdrawal_fee
    BEFORE INSERT ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION calculate_withdrawal_fee();
