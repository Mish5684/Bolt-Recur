/*
  # In-App Notifications System

  ## Overview
  Creates a comprehensive in-app notifications system with dual daily generation (8 PM and 8 AM).
  Supports real-time action validation, deep linking, and notification lifecycle management.

  ## 1. New Tables
    - `in_app_notifications`
      - `id` (uuid, primary key) - Unique notification identifier
      - `user_id` (uuid, references auth.users) - Notification recipient
      - `agent_name` (text) - Which agent generated this (alert, engage, onboarding, gather_more_info, never_tried)
      - `notification_type` (text) - Type of notification (pre_class_reminder, post_class_attendance, onboarding_milestone, etc.)
      - `title` (text) - Notification title
      - `body` (text) - Notification body content
      - `deep_link` (text) - Deep link path for navigation
      - `priority` (text) - Priority level: high, medium, low
      - `metadata` (jsonb) - Validation data: class_id, scheduled_time, attendance_date, etc.
      - `generation_time` (text) - When generated: evening or morning
      - `created_at` (timestamptz) - When notification was created
      - `read_at` (timestamptz, nullable) - When user viewed notification
      - `action_completed_at` (timestamptz, nullable) - When associated action was completed
      - `dismissed_at` (timestamptz, nullable) - When user dismissed notification

    - `notification_push_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `push_type` (text) - evening_summary or morning_summary
      - `sent_at` (timestamptz) - When push was sent
      - `notification_count` (integer) - How many notifications were summarized

  ## 2. Security
    - Enable RLS on both tables
    - Users can only view and update their own notifications
    - Push log is read-only for users

  ## 3. Indexes
    - Composite index on user_id + created_at for efficient queries
    - Index on user_id + read_at for unread count
    - Index on user_id + action_completed_at for actionable items

  ## 4. Helper Functions
    - validate_attendance_completed() - Check if attendance was recorded
    - validate_payment_added() - Check if payment was recorded
    - validate_schedule_added() - Check if schedule was configured
    - cleanup_stale_notifications() - Remove outdated notifications
*/

-- Create in_app_notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL CHECK (agent_name IN ('alert', 'engage', 'onboarding', 'gather_more_info', 'never_tried')),
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  metadata jsonb DEFAULT '{}'::jsonb,
  generation_time text NOT NULL CHECK (generation_time IN ('evening', 'morning')),
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  action_completed_at timestamptz,
  dismissed_at timestamptz
);

-- Create notification_push_log table
CREATE TABLE IF NOT EXISTS notification_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_type text NOT NULL CHECK (push_type IN ('evening_summary', 'morning_summary')),
  sent_at timestamptz DEFAULT now(),
  notification_count integer NOT NULL DEFAULT 0
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_created 
  ON in_app_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_read 
  ON in_app_notifications(user_id, read_at) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_actionable 
  ON in_app_notifications(user_id, action_completed_at, dismissed_at) 
  WHERE action_completed_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_push_log_user_sent 
  ON notification_push_log(user_id, sent_at DESC);

-- Enable RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_push_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for in_app_notifications
CREATE POLICY "Users can view their own notifications"
  ON in_app_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON in_app_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON in_app_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete notifications"
  ON in_app_notifications FOR DELETE
  TO service_role
  USING (true);

-- RLS Policies for notification_push_log
CREATE POLICY "Users can view their own push log"
  ON notification_push_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage push log"
  ON notification_push_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper function: Check if attendance was completed for a notification
CREATE OR REPLACE FUNCTION validate_attendance_completed(
  p_user_id uuid,
  p_class_id uuid,
  p_attendance_date date,
  p_notification_created_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM class_attendance
    WHERE user_id = p_user_id
      AND class_id = p_class_id
      AND attendance_date = p_attendance_date
      AND created_at > p_notification_created_at
  );
END;
$$;

-- Helper function: Check if payment was added for a notification
CREATE OR REPLACE FUNCTION validate_payment_added(
  p_user_id uuid,
  p_class_id uuid,
  p_notification_created_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM payments
    WHERE user_id = p_user_id
      AND class_id = p_class_id
      AND created_at > p_notification_created_at
  );
END;
$$;

-- Helper function: Check if schedule was configured for a class
CREATE OR REPLACE FUNCTION validate_schedule_configured(
  p_user_id uuid,
  p_class_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule jsonb;
BEGIN
  SELECT schedule INTO v_schedule
  FROM classes
  WHERE id = p_class_id
    AND user_id = p_user_id;
  
  RETURN v_schedule IS NOT NULL AND jsonb_array_length(v_schedule) > 0;
END;
$$;

-- Helper function: Cleanup stale notifications
CREATE OR REPLACE FUNCTION cleanup_stale_notifications(
  p_generation_time text,
  p_hours_threshold integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete notifications from specified generation time that are older than threshold
  -- and haven't been explicitly dismissed by user
  DELETE FROM in_app_notifications
  WHERE generation_time = p_generation_time
    AND created_at < now() - (p_hours_threshold || ' hours')::interval
    AND dismissed_at IS NULL
    AND action_completed_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Helper function: Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM in_app_notifications
  WHERE user_id = p_user_id
    AND read_at IS NULL
    AND action_completed_at IS NULL
    AND dismissed_at IS NULL;
  
  RETURN v_count;
END;
$$;

-- Helper function: Get actionable notification count for a user
CREATE OR REPLACE FUNCTION get_actionable_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM in_app_notifications
  WHERE user_id = p_user_id
    AND action_completed_at IS NULL
    AND dismissed_at IS NULL;
  
  RETURN v_count;
END;
$$;

-- Helper function: Check if daily summary push was already sent
CREATE OR REPLACE FUNCTION was_daily_push_sent(
  p_user_id uuid,
  p_push_type text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM notification_push_log
    WHERE user_id = p_user_id
      AND push_type = p_push_type
      AND DATE(sent_at) = p_date
  );
END;
$$;
