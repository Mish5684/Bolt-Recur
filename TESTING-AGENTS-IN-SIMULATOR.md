# Testing Marketing Agents in iOS/Android Simulator

## Overview

The marketing agents run on the **server-side** (Supabase Edge Function), not in your mobile app. However, you can test the entire workflow including push notifications in the simulator.

---

## ⚠️ Important Limitations

### What WON'T Work in Simulator:
- ❌ **Expo Push Notifications** - Simulators cannot receive real push notifications
- ❌ **Device tokens** - Simulators can't register real push tokens

### What WILL Work in Simulator:
- ✅ Agent evaluation logic (runs server-side)
- ✅ Database queries and functions
- ✅ Deep link handling
- ✅ Activity tracking
- ✅ Mock push notifications (visual only)

---

## Testing Strategy

### Option 1: Test on Physical Device (Recommended)
**Best for:** End-to-end testing with real push notifications

### Option 2: Test Agents Directly via SQL (Recommended)
**Best for:** Quick validation of agent logic without mobile app

### Option 3: Mock Notifications in Simulator
**Best for:** Testing UI responses to notifications

---

## Option 1: Test on Physical Device (Full E2E Test)

### Step 1: Build Development Client

```bash
# For iOS (requires Mac + Xcode)
npx expo run:ios --device

# For Android
npx expo run:android --device
```

### Step 2: Install Required Packages

```bash
npm install expo-notifications expo-device date-fns
```

### Step 3: Update Expo Project ID

Edit `shared/utils/pushNotifications.ts`:
```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-actual-expo-project-id', // ⚠️ CRITICAL: Update this!
});
```

Find your project ID:
```bash
npx expo whoami
# Check app.json for slug
# Project ID format: @your-username/your-slug
```

### Step 4: Create Test User with Specific Scenario

**Scenario A: New User (Day 3 - Onboarding Agent)**

```sql
-- Create test user 3 days ago
-- Note: You'll need to do this via auth.admin in edge function or manually
-- For now, create user normally and then backdate:

-- 1. Create user via mobile app login
-- 2. Then run this to backdate:
UPDATE auth.users
SET created_at = NOW() - INTERVAL '3 days'
WHERE email = 'test-day3@example.com';
```

**Scenario B: User with Low Balance (Alert Agent)**

```sql
-- After creating user and logging in:
-- 1. Add family member via app
-- 2. Add class via app
-- 3. Add payment: 5 classes paid
-- 4. Add attendance: 3 classes attended
-- Balance will be 2 (< 3, triggers alert)

-- Add a class scheduled for 2 hours from now:
UPDATE classes
SET schedule = jsonb_build_array(
  jsonb_build_object(
    'day', to_char(NOW() + INTERVAL '2 hours', 'Day'),
    'time', to_char(NOW() + INTERVAL '2 hours', 'HH24:MI')
  )
)
WHERE id = 'your-class-id';
```

**Scenario C: Dormant User (Never Tried Agent)**

```sql
-- Create user 7 days ago with NO family members
UPDATE auth.users
SET created_at = NOW() - INTERVAL '7 days'
WHERE email = 'test-dormant@example.com';

-- Verify no family members
SELECT COUNT(*) FROM family_members WHERE user_id = 'user-id';
-- Should be 0
```

### Step 5: Deploy Edge Function

```bash
# Make sure you're in the project directory
npx supabase functions deploy agent-orchestrator
```

### Step 6: Manually Trigger Orchestrator

```bash
# Call the edge function to evaluate all users
curl -X POST \
  https://zipaxzxolqypaugjvybh.supabase.co/functions/v1/agent-orchestrator \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Get your service role key from: Supabase Dashboard > Settings > API > `service_role` key

### Step 7: Verify Notification Received

- Physical device should receive push notification
- Tap notification to test deep link
- Check that app navigates to correct screen

### Step 8: Verify Database Logs

```sql
-- Check agent decisions
SELECT * FROM agent_decision_log
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC;

-- Check notification history
SELECT * FROM notification_history
WHERE user_id = 'your-test-user-id'
ORDER BY sent_at DESC;

-- Check push token registered
SELECT * FROM user_push_tokens
WHERE user_id = 'your-test-user-id';
```

---

## Option 2: Test Agents via SQL (No Mobile App Needed)

This is the **fastest way** to test agent logic without building the mobile app.

### Step 1: Set Up Test Data

```sql
-- Create a test user (you'll need to do this via Supabase Dashboard > Authentication)
-- Or use an existing user ID

-- Set user's install date to 3 days ago (for onboarding agent test)
UPDATE auth.users
SET created_at = NOW() - INTERVAL '3 days'
WHERE email = 'your-test-email@example.com';

-- Add user preferences
INSERT INTO user_preferences (user_id, timezone)
VALUES ('your-user-id', 'America/New_York')
ON CONFLICT (user_id) DO NOTHING;

-- Add a mock push token (so agent doesn't skip user)
INSERT INTO user_push_tokens (user_id, expo_push_token, is_active)
VALUES ('your-user-id', 'ExponentPushToken[TEST-TOKEN-123]', true)
ON CONFLICT (user_id, expo_push_token) DO NOTHING;
```

### Step 2: Test Individual Agent Logic

Since agents are in TypeScript, you can't run them directly in SQL. Instead, test the **conditions** that trigger each agent:

**Test Onboarding Agent Conditions:**
```sql
-- Check if user qualifies for Day 3 onboarding nudge
WITH user_info AS (
  SELECT
    id,
    email,
    created_at,
    EXTRACT(DAY FROM NOW() - created_at)::integer as days_since_install
  FROM auth.users
  WHERE email = 'your-test-email@example.com'
),
user_classes AS (
  SELECT
    user_id,
    COUNT(*) as class_count
  FROM classes
  WHERE user_id = (SELECT id FROM user_info)
  GROUP BY user_id
),
user_attendance AS (
  SELECT
    user_id,
    COUNT(DISTINCT id) as attendance_count
  FROM class_attendance
  WHERE user_id = (SELECT id FROM user_info)
  GROUP BY user_id
)
SELECT
  ui.email,
  ui.days_since_install,
  COALESCE(uc.class_count, 0) as classes,
  COALESCE(ua.attendance_count, 0) as attendance,
  CASE
    WHEN ui.days_since_install = 3 AND COALESCE(uc.class_count, 0) = 0 THEN 'Would trigger: No class yet'
    WHEN ui.days_since_install = 3 AND COALESCE(ua.attendance_count, 0) = 0 THEN 'Would trigger: No attendance yet'
    WHEN ui.days_since_install = 7 AND COALESCE(ua.attendance_count, 0) < 5 THEN 'Would trigger: Less than 5 attendance'
    ELSE 'Would NOT trigger'
  END as agent_decision
FROM user_info ui
LEFT JOIN user_classes uc ON uc.user_id = ui.id
LEFT JOIN user_attendance ua ON ua.user_id = ui.id;
```

**Test Alert Agent Conditions (Low Balance):**
```sql
-- Check prepaid balance for all family members
WITH balances AS (
  SELECT
    fm.name as family_member,
    c.name as class_name,
    b.classes_paid,
    b.classes_attended,
    b.balance
  FROM family_members fm
  CROSS JOIN classes c
  CROSS JOIN LATERAL get_prepaid_balance(fm.id, c.id) b
  WHERE fm.user_id = 'your-user-id'
    AND c.user_id = 'your-user-id'
    AND c.status = 'active'
)
SELECT
  *,
  CASE
    WHEN balance < 3 AND balance >= 0 THEN '⚠️ Would trigger LOW BALANCE alert'
    WHEN balance < 0 THEN '🚨 Would trigger NEGATIVE BALANCE alert'
    ELSE '✓ OK'
  END as agent_decision
FROM balances;
```

**Test Never Tried Agent Conditions:**
```sql
-- Check if user has zero family members (dormant)
SELECT
  u.email,
  u.created_at,
  EXTRACT(DAY FROM NOW() - u.created_at)::integer as days_since_install,
  COUNT(fm.id) as family_members,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - u.created_at)::integer = 7 AND COUNT(fm.id) = 0 THEN '⚠️ Would trigger Day 7 reactivation'
    WHEN EXTRACT(DAY FROM NOW() - u.created_at)::integer = 30 AND COUNT(fm.id) = 0 THEN '⚠️ Would trigger Day 30 reactivation'
    WHEN EXTRACT(DAY FROM NOW() - u.created_at)::integer = 60 AND COUNT(fm.id) = 0 THEN '⚠️ Would trigger Day 60 reactivation'
    ELSE '✓ User has family members or not on trigger day'
  END as agent_decision
FROM auth.users u
LEFT JOIN family_members fm ON fm.user_id = u.id
WHERE u.email = 'your-test-email@example.com'
GROUP BY u.id, u.email, u.created_at;
```

### Step 3: Manually Insert Test Notification

Simulate what the agent would do:

```sql
-- Insert a test notification (as if agent sent it)
INSERT INTO notification_history (
  user_id,
  agent_name,
  notification_type,
  title,
  body,
  deep_link,
  metadata
)
VALUES (
  'your-user-id',
  'onboarding',
  'day_3_no_class',
  'Ready to add your first class?',
  'Track attendance and spending in seconds. Add a class now!',
  'recur://add-class',
  '{"days_since_install": 3, "classes": 0}'::jsonb
);
```

### Step 4: Test Deep Link

Even in simulator, you can test deep link handling:

```bash
# iOS Simulator
xcrun simctl openurl booted "recur://add-class"
xcrun simctl openurl booted "recur://home"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "recur://add-class" com.recur.classtracker
```

---

## Option 3: Mock Notifications in Simulator

Create a test screen to simulate receiving notifications.

### Step 1: Create Test Screen

```typescript
// screens/TestAgentsScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function TestAgentsScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<string[]>([]);

  const simulateNotification = (agent: string, deepLink: string, title: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Simulating ${agent}: ${title}`]);

    // Simulate notification tap after 2 seconds
    setTimeout(() => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] User tapped notification`]);
      handleDeepLink(deepLink);
    }, 2000);
  };

  const handleDeepLink = (deepLink: string) => {
    const path = deepLink.replace('recur://', '');
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Navigating to: ${path}`]);

    // Parse and navigate
    if (path === 'add-class') {
      navigation.navigate('AddClass' as never);
    } else if (path === 'add-family-member') {
      navigation.navigate('AddFamilyMember' as never);
    } else if (path === 'home') {
      navigation.navigate('Main' as never, { screen: 'Home' } as never);
    } else if (path === 'analytics') {
      navigation.navigate('Main' as never, { screen: 'Analytics' } as never);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Test Marketing Agents</Text>
      <Text style={styles.subtitle}>Simulate push notifications and deep links</Text>

      {/* Onboarding Agent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Onboarding Agent</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateNotification(
            'Onboarding',
            'recur://add-class',
            'Ready to add your first class?'
          )}
        >
          <Text style={styles.buttonText}>Day 3: No Class Yet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateNotification(
            'Onboarding',
            'recur://home',
            'Track your first attendance!'
          )}
        >
          <Text style={styles.buttonText}>Day 3: No Attendance Yet</Text>
        </TouchableOpacity>
      </View>

      {/* Alert Agent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Agent</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateNotification(
            'Alert',
            'recur://class/123',
            'Low balance: Yoga'
          )}
        >
          <Text style={styles.buttonText}>Low Balance Alert</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateNotification(
            'Alert',
            'recur://class/123',
            'Class in 2 hours: Ballet'
          )}
        >
          <Text style={styles.buttonText}>Pre-Class Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* Engage Agent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engage Agent</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateNotification(
            'Engage',
            'recur://class/123',
            'Did you attend Yoga?'
          )}
        >
          <Text style={styles.buttonText}>Post-Class Reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => simulateNotification(
            'Engage',
            'recur://analytics',
            'Your week in classes'
          )}
        >
          <Text style={styles.buttonText}>Weekly Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View style={styles.logsSection}>
        <Text style={styles.logsTitle}>Event Log:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.log}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logsSection: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  logsTitle: {
    color: '#0F0',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  log: {
    color: '#0F0',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
```

### Step 2: Add to Navigation

Add this screen to your app (temporarily for testing):

```typescript
// In your stack navigator
<Stack.Screen name="TestAgents" component={TestAgentsScreen} />
```

### Step 3: Navigate to Test Screen

Add a button in Settings or home screen to navigate to test screen.

---

## Testing Checklist

### Pre-Testing Setup:
- [ ] Install packages: `npm install expo-notifications expo-device date-fns`
- [ ] Update Expo project ID in `pushNotifications.ts`
- [ ] Deploy edge function: `npx supabase functions deploy agent-orchestrator`
- [ ] Run `VERIFY-AND-SETUP-DATABASE.sql` in Supabase

### Test Scenarios:

**Onboarding Agent:**
- [ ] Day 3, no classes → Should send "Add your first class"
- [ ] Day 3, no attendance → Should send "Track your first attendance"
- [ ] Day 7, < 5 attendance → Should send "Keep going!"
- [ ] Onboarding complete → Should NOT send

**Alert Agent:**
- [ ] Low balance (< 3 classes) → Should send low balance alert
- [ ] Class in 2 hours → Should send pre-class reminder
- [ ] Class before 10 AM → Should send at 9 PM prior day

**Engage Agent:**
- [ ] 2 hours after class, no attendance → Should send post-class reminder
- [ ] Sunday 6 PM → Should send weekly summary

**Never Tried Agent:**
- [ ] Day 7, no family members → Should send reactivation
- [ ] Day 30, no family members → Should send reactivation
- [ ] Day 60, no family members → Should send final reactivation

**Gather More Info Agent:**
- [ ] Class < 30 days, no schedule → Should send "Add schedule"
- [ ] Class < 30 days, no payments → Should send "Track payments"

### Verify:
- [ ] Push token registered in database
- [ ] Agent decisions logged correctly
- [ ] Notifications logged in history
- [ ] Deep links navigate correctly
- [ ] Frequency cap working (max 2/day)

---

## Debugging Tips

### Check Edge Function Logs:
```bash
# View real-time logs
npx supabase functions logs agent-orchestrator
```

### Check Database Logs:
```sql
-- Recent agent decisions
SELECT * FROM agent_decision_log ORDER BY created_at DESC LIMIT 10;

-- Recent notifications
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;

-- User push tokens
SELECT * FROM user_push_tokens WHERE is_active = true;
```

### Test Push Token Registration:
```typescript
// In your app, add a test button
import { registerForPushNotifications } from '../shared/utils/pushNotifications';

const handleTest = async () => {
  const token = await registerForPushNotifications();
  console.log('Push token:', token);
};
```

---

## Quick Test Script

```bash
#!/bin/bash
# quick-test-agents.sh

echo "🧪 Testing Marketing Agents..."

# 1. Check database setup
echo "✓ Checking database..."
# Run verification query

# 2. Deploy edge function
echo "✓ Deploying edge function..."
npx supabase functions deploy agent-orchestrator

# 3. Trigger orchestrator
echo "✓ Triggering orchestrator..."
curl -X POST \
  https://zipaxzxolqypaugjvybh.supabase.co/functions/v1/agent-orchestrator \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

echo "✅ Done! Check logs in Supabase dashboard."
```

---

## Recommended Testing Flow

1. **Start with SQL tests** - Fastest way to validate agent logic
2. **Build on physical device** - Test push notifications end-to-end
3. **Use test screen in simulator** - Test UI responses and deep links
4. **Monitor in production** - Use observability queries to track real usage

---

Need help with a specific test scenario? Let me know!
