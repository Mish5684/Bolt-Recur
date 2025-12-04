/*
  ======================================================
  ENGAGEMENT MARKETING AGENTS - OBSERVABILITY QUERIES
  ======================================================

  Run these queries in Supabase SQL Editor to monitor
  agent performance, notification delivery, and user engagement.

  Create views from these queries to build a dashboard.
*/

-- =====================================================
-- 1. AGENT PERFORMANCE SUMMARY (Last 7 Days)
-- =====================================================

-- Overall agent activity
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT
  agent_name,
  COUNT(*) as total_evaluations,
  COUNT(*) FILTER (WHERE decision = 'send_notification') as notifications_sent,
  COUNT(*) FILTER (WHERE decision = 'skip') as skipped,
  ROUND(
    COUNT(*) FILTER (WHERE decision = 'send_notification')::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as send_rate_percentage
FROM agent_decision_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_name
ORDER BY notifications_sent DESC;

-- View it
SELECT * FROM agent_performance_summary;

-- =====================================================
-- 2. NOTIFICATION DELIVERY METRICS
-- =====================================================

-- Notification delivery and open rates
CREATE OR REPLACE VIEW notification_metrics AS
SELECT
  agent_name,
  notification_type,
  COUNT(*) as total_sent,
  COUNT(opened_at) as opened,
  COUNT(*) - COUNT(opened_at) as not_opened,
  ROUND(
    COUNT(opened_at)::numeric / COUNT(*)::numeric * 100,
    2
  ) as open_rate_percentage,
  AVG(EXTRACT(EPOCH FROM (opened_at - sent_at))/60)::integer as avg_time_to_open_minutes
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_name, notification_type
ORDER BY total_sent DESC;

-- View it
SELECT * FROM notification_metrics;

-- =====================================================
-- 3. USER ENGAGEMENT METRICS
-- =====================================================

-- User activity breakdown
CREATE OR REPLACE VIEW user_engagement_metrics AS
SELECT
  event_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', created_at) as event_date
FROM user_activity_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type, DATE_TRUNC('day', created_at)
ORDER BY event_date DESC, total_events DESC;

-- View it
SELECT * FROM user_engagement_metrics
WHERE event_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY event_date DESC;

-- =====================================================
-- 4. ONBOARDING FUNNEL ANALYSIS
-- =====================================================

-- Onboarding progress funnel
CREATE OR REPLACE VIEW onboarding_funnel AS
WITH user_stats AS (
  SELECT
    u.id as user_id,
    u.email,
    u.created_at as install_date,
    EXTRACT(DAY FROM NOW() - u.created_at)::integer as days_since_install,
    COUNT(DISTINCT fm.id) as family_members,
    COUNT(DISTINCT c.id) as classes,
    COUNT(DISTINCT ca.id) as attendance_records,
    up.onboarding_completed_at
  FROM auth.users u
  LEFT JOIN family_members fm ON fm.user_id = u.id
  LEFT JOIN classes c ON c.user_id = u.id
  LEFT JOIN class_attendance ca ON ca.user_id = u.id
  LEFT JOIN user_preferences up ON up.user_id = u.id
  GROUP BY u.id, u.email, u.created_at, up.onboarding_completed_at
)
SELECT
  'Total Users' as stage,
  COUNT(*) as users,
  100.0 as percentage
FROM user_stats
UNION ALL
SELECT
  'Has Family Member' as stage,
  COUNT(*) as users,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM user_stats)::numeric * 100, 1) as percentage
FROM user_stats
WHERE family_members >= 1
UNION ALL
SELECT
  'Has Class' as stage,
  COUNT(*) as users,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM user_stats)::numeric * 100, 1) as percentage
FROM user_stats
WHERE family_members >= 1 AND classes >= 1
UNION ALL
SELECT
  'Has 5+ Attendance' as stage,
  COUNT(*) as users,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM user_stats)::numeric * 100, 1) as percentage
FROM user_stats
WHERE family_members >= 1 AND classes >= 1 AND attendance_records >= 5
UNION ALL
SELECT
  'Onboarding Complete' as stage,
  COUNT(*) as users,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM user_stats)::numeric * 100, 1) as percentage
FROM user_stats
WHERE onboarding_completed_at IS NOT NULL;

-- View it
SELECT * FROM onboarding_funnel;

-- =====================================================
-- 5. AGENT DECISION BREAKDOWN (By Reason)
-- =====================================================

-- Why agents skip users
CREATE OR REPLACE VIEW agent_skip_reasons AS
SELECT
  agent_name,
  reason,
  COUNT(*) as count,
  ROUND(
    COUNT(*)::numeric /
    SUM(COUNT(*)) OVER (PARTITION BY agent_name)::numeric * 100,
    2
  ) as percentage_of_agent_skips
FROM agent_decision_log
WHERE decision = 'skip'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_name, reason
ORDER BY agent_name, count DESC;

-- View it
SELECT * FROM agent_skip_reasons;

-- =====================================================
-- 6. NOTIFICATION FREQUENCY CHECK
-- =====================================================

-- Users who might be getting too many notifications
CREATE OR REPLACE VIEW notification_frequency_check AS
SELECT
  u.email,
  COUNT(*) as notifications_sent,
  MAX(nh.sent_at) as last_notification_sent,
  ARRAY_AGG(DISTINCT nh.agent_name) as agents_contacted
FROM notification_history nh
JOIN auth.users u ON u.id = nh.user_id
WHERE nh.sent_at >= NOW() - INTERVAL '7 days'
GROUP BY u.email
HAVING COUNT(*) > 5
ORDER BY notifications_sent DESC;

-- View it
SELECT * FROM notification_frequency_check;

-- =====================================================
-- 7. AGENT EFFECTIVENESS (Conversions)
-- =====================================================

-- Did notifications lead to user actions?
CREATE OR REPLACE VIEW agent_effectiveness AS
WITH notification_actions AS (
  SELECT
    nh.user_id,
    nh.agent_name,
    nh.sent_at,
    nh.opened_at,
    -- Check for actions within 24 hours of notification
    (
      SELECT COUNT(*)
      FROM user_activity_log ual
      WHERE ual.user_id = nh.user_id
        AND ual.created_at >= nh.sent_at
        AND ual.created_at <= nh.sent_at + INTERVAL '24 hours'
    ) as actions_within_24h
  FROM notification_history nh
  WHERE nh.sent_at >= NOW() - INTERVAL '7 days'
)
SELECT
  agent_name,
  COUNT(*) as notifications_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
  COUNT(*) FILTER (WHERE actions_within_24h > 0) as led_to_action,
  ROUND(
    COUNT(*) FILTER (WHERE actions_within_24h > 0)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as conversion_rate_percentage
FROM notification_actions
GROUP BY agent_name
ORDER BY conversion_rate_percentage DESC;

-- View it
SELECT * FROM agent_effectiveness;

-- =====================================================
-- 8. DAILY AGENT ACTIVITY TIMELINE
-- =====================================================

-- Visualize agent activity over time
CREATE OR REPLACE VIEW daily_agent_activity AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  agent_name,
  COUNT(*) as evaluations,
  COUNT(*) FILTER (WHERE decision = 'send_notification') as notifications_sent,
  COUNT(*) FILTER (WHERE decision = 'skip') as skipped
FROM agent_decision_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), agent_name
ORDER BY date DESC, agent_name;

-- View it
SELECT * FROM daily_agent_activity
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- =====================================================
-- 9. USER NOTIFICATION TIMELINE (Individual User)
-- =====================================================

-- View notification history for a specific user
CREATE OR REPLACE FUNCTION get_user_notification_timeline(p_email text)
RETURNS TABLE(
  notification_date timestamptz,
  agent_name text,
  title text,
  body text,
  opened boolean,
  deep_link text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nh.sent_at,
    nh.agent_name,
    nh.title,
    nh.body,
    (nh.opened_at IS NOT NULL) as opened,
    nh.deep_link
  FROM notification_history nh
  JOIN auth.users u ON u.id = nh.user_id
  WHERE u.email = p_email
  ORDER BY nh.sent_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use it:
-- SELECT * FROM get_user_notification_timeline('user@example.com');

-- =====================================================
-- 10. SYSTEM HEALTH CHECK
-- =====================================================

CREATE OR REPLACE VIEW system_health_check AS
SELECT
  'Total Users' as metric,
  COUNT(*)::text as value
FROM auth.users
UNION ALL
SELECT
  'Users with Push Tokens' as metric,
  COUNT(DISTINCT user_id)::text as value
FROM user_push_tokens
WHERE is_active = true
UNION ALL
SELECT
  'Notifications Sent (Last 24h)' as metric,
  COUNT(*)::text as value
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
  'Agent Evaluations (Last 24h)' as metric,
  COUNT(*)::text as value
FROM agent_decision_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
  'Active Classes' as metric,
  COUNT(*)::text as value
FROM classes
WHERE status = 'active'
UNION ALL
SELECT
  'Average Notifications Per User (Last 7d)' as metric,
  ROUND(AVG(notification_count), 2)::text as value
FROM (
  SELECT user_id, COUNT(*) as notification_count
  FROM notification_history
  WHERE sent_at >= NOW() - INTERVAL '7 days'
  GROUP BY user_id
) sub;

-- View it
SELECT * FROM system_health_check;

-- =====================================================
-- 11. EXPORT FOR EXTERNAL DASHBOARDS
-- =====================================================

-- Create a JSON export for external tools (e.g., Google Sheets, Metabase)
CREATE OR REPLACE FUNCTION export_agent_metrics_json()
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'generated_at', NOW(),
    'agent_performance', (SELECT json_agg(row_to_json(t)) FROM agent_performance_summary t),
    'notification_metrics', (SELECT json_agg(row_to_json(t)) FROM notification_metrics t),
    'onboarding_funnel', (SELECT json_agg(row_to_json(t)) FROM onboarding_funnel t),
    'system_health', (SELECT json_agg(row_to_json(t)) FROM system_health_check t)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use it:
-- SELECT export_agent_metrics_json();

-- =====================================================
-- QUICK DASHBOARD (Run this for overview)
-- =====================================================

-- Quick overview of everything
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== AGENT PERFORMANCE (Last 7 Days) ===';
  FOR rec IN SELECT * FROM agent_performance_summary LOOP
    RAISE NOTICE '% - Sent: %, Skipped: %, Send Rate: %%',
      rec.agent_name, rec.notifications_sent, rec.skipped, rec.send_rate_percentage;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== NOTIFICATION METRICS (Last 7 Days) ===';
  FOR rec IN SELECT * FROM notification_metrics LOOP
    RAISE NOTICE '% (%) - Sent: %, Opened: %, Open Rate: %%',
      rec.agent_name, rec.notification_type, rec.total_sent, rec.opened, rec.open_rate_percentage;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== SYSTEM HEALTH ===';
  FOR rec IN SELECT * FROM system_health_check LOOP
    RAISE NOTICE '%: %', rec.metric, rec.value;
  END LOOP;
END $$;
