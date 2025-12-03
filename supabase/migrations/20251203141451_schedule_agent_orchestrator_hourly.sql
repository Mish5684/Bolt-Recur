/*
  # Schedule Agent Orchestrator to Run Every Hour

  ## Overview
  This migration sets up automatic hourly execution of the agent orchestrator
  edge function using pg_cron. The orchestrator evaluates all marketing agents
  and sends push notifications based on user behavior and engagement patterns.

  ## Changes
  1. Enable pg_cron extension for scheduled job execution
  2. Enable pg_net extension for HTTP requests to edge functions
  3. Create hourly cron job that invokes the agent-orchestrator edge function
  
  ## Schedule
  - Runs every hour at minute 0 (e.g., 1:00 AM, 2:00 AM, 3:00 AM, etc.)
  - Cron expression: '0 * * * *'
  
  ## Important Notes
  - The cron job uses the service role to authenticate with the edge function
  - All agent logic (quiet hours, frequency caps, pause-aware filtering) is
    handled within the edge function itself
  - Job execution logs can be viewed in the cron.job_run_details table
*/

-- =====================================================
-- ENABLE REQUIRED EXTENSIONS
-- =====================================================

-- Enable pg_cron for scheduled job execution
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for making HTTP requests (Supabase built-in)
-- Note: pg_net is pre-installed in Supabase, but we reference it here for clarity

-- =====================================================
-- UNSCHEDULE EXISTING JOB (IF ANY)
-- =====================================================

-- Remove any existing agent orchestrator schedule to avoid duplicates
DO $$
BEGIN
  -- Unschedule by job name if it exists
  PERFORM cron.unschedule('agent-orchestrator-hourly');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- =====================================================
-- SCHEDULE AGENT ORCHESTRATOR
-- =====================================================

-- Schedule the orchestrator to run every hour
-- The function invokes the edge function via HTTP POST
SELECT cron.schedule(
  'agent-orchestrator-hourly',  -- Job name
  '0 * * * *',                   -- Every hour at minute 0 (1:00, 2:00, 3:00, etc.)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/agent-orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =====================================================
-- CREATE APP SETTINGS (IF NOT EXISTS)
-- =====================================================

-- Store Supabase URL and service role key in database settings
-- These are used by the cron job to authenticate with edge functions
-- Note: These should be set via environment variables or Supabase dashboard

DO $$
BEGIN
  -- Set Supabase URL from environment
  PERFORM set_config(
    'app.settings.supabase_url',
    current_setting('SUPABASE_URL', true),
    false
  );
  
  -- Set service role key from environment
  PERFORM set_config(
    'app.settings.service_role_key',
    current_setting('SUPABASE_SERVICE_ROLE_KEY', true),
    false
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Settings not available, will need to be configured manually
    RAISE NOTICE 'Note: Supabase URL and service role key need to be configured in database settings';
END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- View scheduled jobs (uncomment to verify)
-- SELECT * FROM cron.job WHERE jobname = 'agent-orchestrator-hourly';

-- View job execution history (uncomment to check logs)
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'agent-orchestrator-hourly')
-- ORDER BY start_time DESC 
-- LIMIT 10;
