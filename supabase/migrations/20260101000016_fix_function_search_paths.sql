-- Security hardening: Set search_path for all security definer functions
-- This prevents "search_path" attacks by explicitly defining which schema to look in.

-- 1. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. handle_user_update
ALTER FUNCTION public.handle_user_update() SET search_path = public;

-- 3. get_public_config
ALTER FUNCTION public.get_public_config() SET search_path = public;

-- 4. update_withdrawals_updated_at
ALTER FUNCTION public.update_withdrawals_updated_at() SET search_path = public;

-- 5. calculate_withdrawal_fee
ALTER FUNCTION public.calculate_withdrawal_fee() SET search_path = public;

-- 6. check_is_admin (safety)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_is_admin') THEN
        ALTER FUNCTION public.check_is_admin() SET search_path = public;
    END IF;
END $$;
