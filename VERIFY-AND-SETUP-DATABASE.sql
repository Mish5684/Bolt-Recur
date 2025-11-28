/*
  ======================================================
  ENGAGEMENT MARKETING AGENTS - DATABASE VERIFICATION
  ======================================================

  Run this script in your Supabase SQL Editor to:
  1. Check if all required tables and functions exist
  2. Create them if they don't exist
  3. Verify everything is set up correctly

  Project: https://zipaxzxolqypaugjvybh.supabase.co
*/

-- =====================================================
-- STEP 1: VERIFY EXISTING TABLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== CHECKING EXISTING TABLES ===';

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_push_tokens') THEN
    RAISE NOTICE '✓ user_push_tokens exists';
  ELSE
    RAISE NOTICE '✗ user_push_tokens MISSING';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_history') THEN
    RAISE NOTICE '✓ notification_history exists';
  ELSE
    RAISE NOTICE '✗ notification_history MISSING';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_activity_log') THEN
    RAISE NOTICE '✓ user_activity_log exists';
  ELSE
    RAISE NOTICE '✗ user_activity_log MISSING';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_decision_log') THEN
    RAISE NOTICE '✓ agent_decision_log exists';
  ELSE
    RAISE NOTICE '✗ agent_decision_log MISSING';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    RAISE NOTICE '✓ user_preferences exists';
  ELSE
    RAISE NOTICE '✗ user_preferences MISSING';
  END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE TABLES IF NOT EXISTS
-- =====================================================

-- Create user_push_tokens table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_id text,
  last_used_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

-- Create notification_history table
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create agent_decision_log table
CREATE TABLE IF NOT EXISTS agent_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  decision text NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  timezone text DEFAULT 'UTC',
  onboarding_completed_at timestamptz,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON user_push_tokens(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_agent ON notification_history(agent_name, sent_at);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON user_activity_log(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON user_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_user ON agent_decision_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent ON agent_decision_log(agent_name, created_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- USER_PUSH_TOKENS POLICIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Users can view own push tokens'
  ) THEN
    CREATE POLICY "Users can view own push tokens"
      ON user_push_tokens FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Users can create own push tokens'
  ) THEN
    CREATE POLICY "Users can create own push tokens"
      ON user_push_tokens FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Users can update own push tokens'
  ) THEN
    CREATE POLICY "Users can update own push tokens"
      ON user_push_tokens FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_push_tokens' AND policyname = 'Users can delete own push tokens'
  ) THEN
    CREATE POLICY "Users can delete own push tokens"
      ON user_push_tokens FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- NOTIFICATION_HISTORY POLICIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_history' AND policyname = 'Users can view own notification history'
  ) THEN
    CREATE POLICY "Users can view own notification history"
      ON notification_history FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_history' AND policyname = 'Users can create own notification history'
  ) THEN
    CREATE POLICY "Users can create own notification history"
      ON notification_history FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_history' AND policyname = 'Users can update own notification history'
  ) THEN
    CREATE POLICY "Users can update own notification history"
      ON notification_history FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- USER_ACTIVITY_LOG POLICIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_log' AND policyname = 'Users can view own activity log'
  ) THEN
    CREATE POLICY "Users can view own activity log"
      ON user_activity_log FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_log' AND policyname = 'Users can create own activity log'
  ) THEN
    CREATE POLICY "Users can create own activity log"
      ON user_activity_log FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- AGENT_DECISION_LOG POLICIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_decision_log' AND policyname = 'Users can view own agent decisions'
  ) THEN
    CREATE POLICY "Users can view own agent decisions"
      ON agent_decision_log FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_decision_log' AND policyname = 'Users can create own agent decisions'
  ) THEN
    CREATE POLICY "Users can create own agent decisions"
      ON agent_decision_log FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- USER_PREFERENCES POLICIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences"
      ON user_preferences FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can create own preferences'
  ) THEN
    CREATE POLICY "Users can create own preferences"
      ON user_preferences FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can update own preferences'
  ) THEN
    CREATE POLICY "Users can update own preferences"
      ON user_preferences FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can delete own preferences'
  ) THEN
    CREATE POLICY "Users can delete own preferences"
      ON user_preferences FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get prepaid balance for a family member's class
CREATE OR REPLACE FUNCTION get_prepaid_balance(
  p_family_member_id uuid,
  p_class_id uuid
)
RETURNS TABLE(classes_paid integer, classes_attended integer, balance integer) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.classes_paid), 0)::integer AS classes_paid,
    COUNT(DISTINCT ca.id)::integer AS classes_attended,
    (COALESCE(SUM(p.classes_paid), 0) - COUNT(DISTINCT ca.id))::integer AS balance
  FROM payments p
  FULL OUTER JOIN class_attendance ca
    ON ca.family_member_id = p_family_member_id
    AND ca.class_id = p_class_id
  WHERE
    (p.family_member_id = p_family_member_id AND p.class_id = p_class_id)
    OR (ca.family_member_id = p_family_member_id AND ca.class_id = p_class_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification count for today
CREATE OR REPLACE FUNCTION get_notification_count_today(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM notification_history
    WHERE user_id = p_user_id
      AND sent_at >= CURRENT_DATE
      AND sent_at < CURRENT_DATE + INTERVAL '1 day'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has received notification from agent recently
CREATE OR REPLACE FUNCTION has_recent_notification(
  p_user_id uuid,
  p_agent_name text,
  p_days integer DEFAULT 1
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM notification_history
    WHERE user_id = p_user_id
      AND agent_name = p_agent_name
      AND sent_at >= NOW() - (p_days || ' days')::interval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
  table_count integer;
  function_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL VERIFICATION ===';

  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'user_push_tokens',
    'notification_history',
    'user_activity_log',
    'agent_decision_log',
    'user_preferences'
  );

  RAISE NOTICE 'Tables created: % of 5', table_count;

  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'get_prepaid_balance',
    'get_notification_count_today',
    'has_recent_notification'
  );

  RAISE NOTICE 'Functions created: % of 3', function_count;

  IF table_count = 5 AND function_count = 3 THEN
    RAISE NOTICE '✓ ALL SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy the Edge Function: npx supabase functions deploy agent-orchestrator';
    RAISE NOTICE '2. Configure cron job (see DEPLOYMENT-GUIDE-AGENTS.md)';
    RAISE NOTICE '3. Install mobile packages: npm install expo-notifications expo-device date-fns';
  ELSE
    RAISE NOTICE '✗ SETUP INCOMPLETE - Please check for errors above';
  END IF;
END $$;

-- =====================================================
-- OPTIONAL: TEST QUERIES
-- =====================================================

-- Test the functions (uncomment to run)
/*
-- Test prepaid balance (will return 0,0,0 if no data)
SELECT * FROM get_prepaid_balance(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid
);

-- Test notification count
SELECT get_notification_count_today(auth.uid());

-- Test recent notification check
SELECT has_recent_notification(auth.uid(), 'onboarding', 3);
*/

-- View all tables and their row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'user_push_tokens',
  'notification_history',
  'user_activity_log',
  'agent_decision_log',
  'user_preferences'
)
ORDER BY tablename;
