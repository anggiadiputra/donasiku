-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Verify if the job already exists and unschedule it to update
select cron.unschedule('check-expired-transactions');

-- Schedule the cron job to run every 10 minutes
-- IMPORTANT: You must replace [PROJECT_REF] and [SERVICE_ROLE_KEY] with your actual Supabase project details.
-- You can find these in your Supabase Dashboard -> Project Settings -> API.
/*
select cron.schedule(
  'check-expired-transactions',
  '0 * * * *', -- Runs every hour (Change to * * * * * for every minute if needed, or */10 * * * * for 10 mins)
  $$
  select
    net.http_post(
      url:='https://[PROJECT_REF].supabase.co/functions/v1/cron-check-transactions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
*/

-- NOTE: Since we cannot know your Project REF and Key in this migration file securely,
-- please run the above SQL command manually in the Supabase SQL Editor after replacing the placeholders.
