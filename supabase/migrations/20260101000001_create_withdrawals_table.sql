-- Create withdrawal status enum
DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status withdrawal_status DEFAULT 'pending',
    bank_info JSONB NOT NULL,
    admin_note TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals"
    ON public.withdrawals
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own withdrawals
CREATE POLICY "Users can insert own withdrawals"
    ON public.withdrawals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
    ON public.withdrawals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update withdrawals
CREATE POLICY "Admins can update withdrawals"
    ON public.withdrawals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_withdrawals_updated_at_trigger
    BEFORE UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawals_updated_at();

-- Add index for performance
CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS withdrawals_campaign_id_idx ON public.withdrawals(campaign_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON public.withdrawals(status);
