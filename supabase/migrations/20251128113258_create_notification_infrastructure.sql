/*
  # Create Notification and Agent Infrastructure

  ## Overview
  This migration creates the complete infrastructure for the marketing agent system
  including push tokens, notification history, activity tracking, and agent decision logs.

  ## New Tables
  
  1. **user_push_tokens** - Store Expo push notification tokens
     - id, user_id, expo_push_token, device_id, last_used_at, is_active, created_at
     
  2. **notification_history** - Track all sent notifications for frequency capping
     - id, user_id, agent_name, notification_type, title, body, deep_link, sent_at, opened_at, created_at
     
  3. **user_activity_log** - Track user actions for agent evaluation
     - id, user_id, event_type, event_data, created_at
     
  4. **agent_decision_log** - Log agent decisions for debugging and analytics
     - id, user_id, agent_name, decision, reason, metadata, created_at

  5. **user_preferences** - Store user timezone and onboarding completion
     - id, user_id, timezone, onboarding_completed_at, created_at, updated_at

  ## Security Model
  
  All tables use Row Level Security with user isolation.
  Users can only see and manage their own data.
  
  ## Important Notes
  - All user_id columns are required (NOT NULL)
  - RLS is RESTRICTIVE by default
  - Indexes added for performance on frequently queried columns
*/

-- =====================================================
-- CREATE TABLES
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
-- CREATE INDEXES FOR PERFORMANCE
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
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER_PUSH_TOKENS POLICIES
-- =====================================================

CREATE POLICY "Users can view own push tokens"
  ON user_push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own push tokens"
  ON user_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON user_push_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATION_HISTORY POLICIES
-- =====================================================

CREATE POLICY "Users can view own notification history"
  ON notification_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notification history"
  ON notification_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification history"
  ON notification_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER_ACTIVITY_LOG POLICIES
-- =====================================================

CREATE POLICY "Users can view own activity log"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity log"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- AGENT_DECISION_LOG POLICIES
-- =====================================================

CREATE POLICY "Users can view own agent decisions"
  ON agent_decision_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent decisions"
  ON agent_decision_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER_PREFERENCES POLICIES
-- =====================================================

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
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