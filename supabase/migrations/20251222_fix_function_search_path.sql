-- Fix Function Search Path Mutable security warnings
-- This sets explicit search_path for all functions to prevent potential SQL injection

-- Fix update_payment_methods_updated_at
ALTER FUNCTION public.update_payment_methods_updated_at() SET search_path = public, pg_temp;

-- Fix update_settings_updated_at
ALTER FUNCTION public.update_settings_updated_at() SET search_path = public, pg_temp;

-- Fix increment_amen
ALTER FUNCTION public.increment_amen(uuid, boolean) SET search_path = public, pg_temp;

-- Fix update_zakat_settings_updated_at
ALTER FUNCTION public.update_zakat_settings_updated_at() SET search_path = public, pg_temp;

-- Fix update_infaq_settings_updated_at
ALTER FUNCTION public.update_infaq_settings_updated_at() SET search_path = public, pg_temp;

-- Fix update_layout_settings_updated_at
ALTER FUNCTION public.update_layout_settings_updated_at() SET search_path = public, pg_temp;

-- Fix update_testimonials_updated_at
ALTER FUNCTION public.update_testimonials_updated_at() SET search_path = public, pg_temp;

-- Fix update_transactions_updated_at
ALTER FUNCTION public.update_transactions_updated_at() SET search_path = public, pg_temp;

-- Fix handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- Fix handle_user_update
ALTER FUNCTION public.handle_user_update() SET search_path = public, pg_temp;

-- Note: The "Leaked Password Protection Disabled" warning is a Supabase project-level setting
-- that needs to be enabled in the Supabase Dashboard under Authentication -> Policies
