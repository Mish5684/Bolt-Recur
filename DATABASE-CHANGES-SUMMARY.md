# Database Changes Summary - Engagement Marketing Agents

## What Changes Were Made to Supabase?

I applied one migration that creates **5 new tables** and **3 helper functions** for the engagement marketing agents system.

### Migration Applied
- **File**: `supabase/migrations/20251128113258_create_notification_infrastructure.sql`
- **Applied via**: Supabase MCP tool (automatically applied to your project)
- **Project**: https://zipaxzxolqypaugjvybh.supabase.co

---

## New Database Tables

### 1. **user_push_tokens**
Stores Expo push notification tokens for sending notifications to users.

**Columns:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - References auth.users, NOT NULL
- `expo_push_token` (text) - The Expo push token, NOT NULL
- `device_id` (text) - Device identifier
- `last_used_at` (timestamptz) - When token was last used
- `is_active` (boolean) - Whether token is active (default: true)
- `created_at` (timestamptz) - When token was registered

**Unique Constraint:** (user_id, expo_push_token)

**RLS Enabled:** Yes - Users can only see/manage their own tokens

---

### 2. **notification_history**
Tracks all notifications sent to users for frequency capping and analytics.

**Columns:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - References auth.users, NOT NULL
- `agent_name` (text) - Which agent sent the notification, NOT NULL
- `notification_type` (text) - Type of notification, NOT NULL
- `title` (text) - Notification title, NOT NULL
- `body` (text) - Notification body, NOT NULL
- `deep_link` (text) - Deep link URL (optional)
- `metadata` (jsonb) - Additional data (default: {})
- `sent_at` (timestamptz) - When notification was sent
- `opened_at` (timestamptz) - When user opened notification (nullable)
- `created_at` (timestamptz) - Record creation time

**RLS Enabled:** Yes - Users can only see their own notification history

---

### 3. **user_activity_log**
Tracks user actions (family member added, class added, attendance marked, payment recorded) for agent decision making.

**Columns:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - References auth.users, NOT NULL
- `event_type` (text) - Type of event, NOT NULL
  - Examples: 'family_member_added', 'class_added', 'attendance_marked', 'payment_recorded'
- `event_data` (jsonb) - Event details (default: {})
- `created_at` (timestamptz) - When event occurred

**RLS Enabled:** Yes - Users can only see their own activity

**Tracked Events:**
- `family_member_added` - When user adds a family member
- `class_added` - When user creates a class
- `attendance_marked` - When user marks attendance
- `payment_recorded` - When user records a payment

---

### 4. **agent_decision_log**
Logs agent decisions for debugging and analytics.

**Columns:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - References auth.users, NOT NULL
- `agent_name` (text) - Agent that made decision, NOT NULL
- `decision` (text) - Decision made (e.g., 'send_notification', 'skip'), NOT NULL
- `reason` (text) - Reason for decision (optional)
- `metadata` (jsonb) - Additional context (default: {})
- `created_at` (timestamptz) - When decision was made

**RLS Enabled:** Yes - Users can only see decisions about themselves

---

### 5. **user_preferences**
Stores user preferences including timezone and onboarding completion status.

**Columns:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - References auth.users, UNIQUE, NOT NULL
- `timezone` (text) - User's timezone (default: 'UTC')
- `onboarding_completed_at` (timestamptz) - When user completed onboarding (nullable)
- `notification_preferences` (jsonb) - Notification settings (default: {})
- `created_at` (timestamptz) - Record creation time
- `updated_at` (timestamptz) - Last update time

**RLS Enabled:** Yes - Users can only see/manage their own preferences

---

## Database Functions

### 1. **get_prepaid_balance(family_member_id, class_id)**
Calculates prepaid balance for a specific family member and class.

**Returns:**
- `classes_paid` (integer) - Total classes paid for
- `classes_attended` (integer) - Total classes attended
- `balance` (integer) - Remaining prepaid classes

**Usage:**
```sql
SELECT * FROM get_prepaid_balance(
  'some-family-member-id',
  'some-class-id'
);
```

---

### 2. **get_notification_count_today(user_id)**
Returns count of notifications sent to user today (for frequency capping).

**Returns:** integer (count)

**Usage:**
```sql
SELECT get_notification_count_today('some-user-id');
```

---

### 3. **has_recent_notification(user_id, agent_name, days)**
Checks if user received notification from specific agent within X days.

**Parameters:**
- `user_id` (uuid) - User to check
- `agent_name` (text) - Agent name (e.g., 'onboarding')
- `days` (integer) - Days to look back (default: 1)

**Returns:** boolean

**Usage:**
```sql
SELECT has_recent_notification('some-user-id', 'onboarding', 3);
```

---

## Indexes Created

For optimal query performance, the following indexes were created:

**user_push_tokens:**
- `idx_push_tokens_user_id` on (user_id)
- `idx_push_tokens_active` on (user_id, is_active)

**notification_history:**
- `idx_notification_history_user_id` on (user_id)
- `idx_notification_history_sent_at` on (user_id, sent_at)
- `idx_notification_history_agent` on (agent_name, sent_at)

**user_activity_log:**
- `idx_activity_log_user_id` on (user_id)
- `idx_activity_log_event_type` on (user_id, event_type)
- `idx_activity_log_created` on (created_at)

**agent_decision_log:**
- `idx_agent_decisions_user` on (user_id, created_at)
- `idx_agent_decisions_agent` on (agent_name, created_at)

**user_preferences:**
- `idx_user_preferences_user_id` on (user_id)

---

## Security (RLS Policies)

All tables have Row Level Security enabled with the following rules:

### For all tables:
- ✅ Users can SELECT their own data
- ✅ Users can INSERT their own data
- ✅ Users can UPDATE their own data (where applicable)
- ✅ Users can DELETE their own data (where applicable)

### Data Isolation:
- All policies use `auth.uid() = user_id` to ensure users only access their own data
- Service role can access all data (needed for agent orchestrator)
- Anonymous users have NO access

---

## How to Verify Setup

### Quick Check
Run this in Supabase SQL Editor:
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
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
```

If you see all 5 tables, everything is set up! ✅

### Full Verification
Run the complete verification script:
- File: `VERIFY-AND-SETUP-DATABASE.sql`
- This will check tables, functions, policies, and create anything missing

---

## What If Tables Are Missing?

**Option 1: Run the verification script**
Copy and paste `VERIFY-AND-SETUP-DATABASE.sql` into Supabase SQL Editor and run it. It will:
- Check what exists
- Create anything missing
- Verify everything is correct

**Option 2: Check migrations**
The migration should have been auto-applied. Check in Supabase Dashboard:
- Go to Database > Migrations
- Look for migration: `20251128113258_create_notification_infrastructure`
- If missing, the migration didn't run

**Option 3: Manual check**
Go to Supabase Dashboard > Table Editor and check if you see these tables:
- user_push_tokens
- notification_history
- user_activity_log
- agent_decision_log
- user_preferences

---

## Important Notes

1. **No data loss**: These are all NEW tables. No existing data was modified.

2. **User isolation**: RLS ensures users can only see their own data.

3. **Activity tracking**: The mobile app now automatically tracks:
   - When users add family members
   - When users create classes
   - When users mark attendance
   - When users record payments

4. **Push tokens**: Will be registered automatically when users log in (after you install `expo-notifications` package).

5. **Agent decisions**: Will be logged automatically when the agent orchestrator runs.

---

## Next Steps

1. ✅ **Verify tables exist** - Run `VERIFY-AND-SETUP-DATABASE.sql`
2. 📦 **Install packages** - `npm install expo-notifications expo-device date-fns`
3. 🚀 **Deploy edge function** - See `DEPLOYMENT-GUIDE-AGENTS.md`
4. ⏰ **Set up cron** - Schedule hourly execution
5. 📱 **Test on device** - Build and test push notifications

---

## Questions?

- **Tables missing?** → Run `VERIFY-AND-SETUP-DATABASE.sql`
- **How to test?** → See `DEPLOYMENT-GUIDE-AGENTS.md`
- **Agent not working?** → Check `agent_decision_log` table for decisions
- **Notifications not sending?** → Check `notification_history` table

---

**Database Version:** PostgreSQL (Supabase)
**Project URL:** https://zipaxzxolqypaugjvybh.supabase.co
**Migration Date:** 2025-11-28
