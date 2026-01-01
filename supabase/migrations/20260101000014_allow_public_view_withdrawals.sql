-- Allow public to view approved and completed withdrawals for transparency
CREATE POLICY "Public can view approved or completed withdrawals"
    ON public.withdrawals
    FOR SELECT
    USING (status IN ('approved', 'completed'));
