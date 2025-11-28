---
title: Recur - Engagement Marketing Agents System
version: 1.0.0
date: 2025-11-28
status: Planning
---

# Recur Engagement Marketing Agents - Product Requirements Document

## Executive Summary

An autonomous, rule-based marketing agent system that monitors user behavior and sends personalized push notifications to drive engagement, retention, and feature adoption in the Recur mobile app. The system operates 24/7 without manual intervention, adapting to each user's unique journey through five behavioral cohorts.

### Goals
- Drive new users to "1-1-5" activation (1 family member, 1 class, 5 attendance records) within 14 days
- Re-engage dormant users who installed but never completed setup
- Maintain active user engagement through reminders and celebrations
- Alert users to important account states (low prepaid balance, missed classes)
- Reactivate churned users who have stopped tracking attendance

### Success Metrics
- 70%+ of new users reach 1-1-5 activation within 14 days (baseline: ~30%)
- 40%+ of "Never Tried" users convert to active within 14 days of first nudge
- 50%+ reduction in missed scheduled classes through reminders
- 30%+ increase in payment tracking adoption
- 60%+ notification open rate
- 25%+ action rate (user takes intended action after notification)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Behavior Tracking](#user-behavior-tracking)
3. [User Segmentation & Cohorts](#user-segmentation--cohorts)
4. [Marketing Agents](#marketing-agents)
5. [Agent Orchestration](#agent-orchestration)
6. [Push Notification System](#push-notification-system)
7. [Database Schema](#database-schema)
8. [Implementation Plan](#implementation-plan)
9. [Observability Infrastructure](#observability-infrastructure)
10. [Edge Cases & Complexities](#edge-cases--complexities)

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│  - Tracks user actions (app open, CRUD operations)          │
│  - Receives & displays push notifications                    │
│  - Handles notification taps (deep links)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓ ↑
                    Activity Events  |  Push Notifications
                              ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (Backend)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Database (PostgreSQL)                                │  │
│  │  - User activity logs                                 │  │
│  │  - User engagement metrics                            │  │
│  │  - Notification history                               │  │
│  │  - Agent decisions log                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Serverless)                          │  │
│  │  - Agent Orchestrator (runs every hour)              │  │
│  │  - 5 Marketing Agents (evaluate users)               │  │
│  │  - Notification Sender (via Expo Push API)           │  │
│  │  - Activity Processor (real-time metrics)            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  Expo Push API   │
                    │  (FCM/APNs)      │
                    └──────────────────┘
```

### Key Principles

1. **Rule-Based, Not AI**: All logic is deterministic - no LLMs, clear decision trees
2. **User-Centric**: Every notification is personalized with user's data (names, class types, dates)
3. **Non-Intrusive**: Max 2 notifications/day, quiet hours (10 PM - 8 AM), respects user preferences
4. **Context-Aware**: Agents understand multiple class states and prioritize intelligently
5. **Measurable**: Every decision logged, every notification tracked, every outcome measured

---

## User Behavior Tracking

### What We Track

#### App-Level Events
| Event | When | Data Captured |
|-------|------|---------------|
| `app_opened` | App launches | timestamp, session_id, platform (iOS/Android) |
| `app_backgrounded` | App goes to background | timestamp, session_id, duration_seconds |
| `session_ended` | App closes | timestamp, session_id, total_duration_seconds |

#### Feature Usage Events
| Event | When | Data Captured |
|-------|------|---------------|
| `family_member_added` | New family member created | timestamp, member_id, member_name |
| `family_member_updated` | Family member edited | timestamp, member_id |
| `family_member_deleted` | Family member removed | timestamp, member_id |
| `class_added` | New class created | timestamp, class_id, class_name, has_schedule |
| `class_updated` | Class edited | timestamp, class_id, schedule_changed |
| `class_deleted` | Class removed | timestamp, class_id |
| `attendance_marked` | Attendance recorded | timestamp, class_id, family_member_id, class_date |
| `attendance_removed` | Attendance deleted | timestamp, attendance_id |
| `payment_recorded` | Payment added | timestamp, payment_id, class_id, amount |
| `payment_updated` | Payment edited | timestamp, payment_id |
| `payment_deleted` | Payment removed | timestamp, payment_id |
| `schedule_added` | Schedule set for class | timestamp, class_id, schedule_days |
| `schedule_updated` | Schedule modified | timestamp, class_id |

#### Notification Events
| Event | When | Data Captured |
|-------|------|---------------|
| `notification_sent` | Push notification delivered | timestamp, notification_id, agent_id, message |
| `notification_opened` | User taps notification | timestamp, notification_id, time_to_open_seconds |
| `notification_dismissed` | User swipes away | timestamp, notification_id |
| `notification_action_taken` | User completes intended action | timestamp, notification_id, action_type |

#### Screen Navigation Events (Optional - Phase 2)
| Event | When | Data Captured |
|-------|------|---------------|
| `screen_viewed` | User navigates to screen | timestamp, screen_name, from_screen |
| `screen_exited` | User leaves screen | timestamp, screen_name, duration_seconds |

### How We Track

**Mobile App Implementation:**

```typescript
// shared/utils/analytics.ts

import { supabase } from '../api/supabase';

interface ActivityEvent {
  event_type: string;
  event_data: Record<string, any>;
  session_id?: string;
}

class ActivityTracker {
  private sessionId: string | null = null;
  private eventQueue: ActivityEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  // Start new session when app opens
  async startSession() {
    this.sessionId = `session_${Date.now()}_${Math.random()}`;
    await this.trackEvent('app_opened', {
      session_id: this.sessionId,
      platform: Platform.OS,
    });

    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => this.flushEvents(), 30000);
  }

  // End session when app backgrounds
  async endSession(duration: number) {
    await this.trackEvent('session_ended', {
      session_id: this.sessionId,
      duration_seconds: duration,
    });
    await this.flushEvents();
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.sessionId = null;
  }

  // Track individual event
  async trackEvent(eventType: string, eventData: Record<string, any> = {}) {
    const event: ActivityEvent = {
      event_type: eventType,
      event_data: {
        ...eventData,
        timestamp: new Date().toISOString(),
      },
      session_id: this.sessionId || undefined,
    };

    this.eventQueue.push(event);

    // Flush immediately for critical events
    if (['app_opened', 'session_ended'].includes(eventType)) {
      await this.flushEvents();
    }
  }

  // Batch send events to backend
  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert events in batch
      await supabase.from('user_activity_log').insert(
        eventsToSend.map(event => ({
          user_id: user.id,
          event_type: event.event_type,
          event_data: event.event_data,
          session_id: event.session_id,
        }))
      );
    } catch (error) {
      console.error('Failed to flush activity events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToSend);
    }
  }
}

export const activityTracker = new ActivityTracker();

// Convenience functions
export const trackAppOpen = () => activityTracker.startSession();
export const trackAppBackground = (duration: number) => activityTracker.endSession(duration);
export const trackFamilyMemberAdded = (memberId: string, memberName: string) =>
  activityTracker.trackEvent('family_member_added', { member_id: memberId, member_name: memberName });
export const trackClassAdded = (classId: string, className: string, hasSchedule: boolean) =>
  activityTracker.trackEvent('class_added', { class_id: classId, class_name: className, has_schedule: hasSchedule });
export const trackAttendanceMarked = (classId: string, memberId: string, classDate: string) =>
  activityTracker.trackEvent('attendance_marked', { class_id: classId, family_member_id: memberId, class_date: classDate });
export const trackPaymentRecorded = (paymentId: string, classId: string, amount: number) =>
  activityTracker.trackEvent('payment_recorded', { payment_id: paymentId, class_id: classId, amount });
export const trackNotificationOpened = (notificationId: string) =>
  activityTracker.trackEvent('notification_opened', { notification_id: notificationId });
```

**Integration Points in App:**

```typescript
// App.tsx - Track app lifecycle
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      trackAppOpen();
    } else if (nextAppState === 'background') {
      trackAppBackground(sessionDuration);
    }
  });

  return () => subscription.remove();
}, []);

// AddFamilyMemberScreen.tsx - Track member creation
const handleAddMember = async () => {
  const memberId = await useRecur.getState().addFamilyMember(memberData);
  if (memberId) {
    trackFamilyMemberAdded(memberId, memberData.name);
  }
};

// ClassDetailScreen.tsx - Track attendance
const handleMarkAttendance = async () => {
  await useRecur.getState().addAttendance(attendanceData);
  trackAttendanceMarked(classId, memberId, date);
};
```

---

## User Segmentation & Cohorts

### Segmentation Logic

Users are dynamically assigned to cohorts based on their current state. A user can belong to **multiple cohorts simultaneously** if they have multiple classes in different states.

### Cohort Definitions

#### 1. New User Onboarding
**Definition:** User installed app within last 14 days AND has not yet reached 1-1-5 milestone

**Criteria:**
- `created_at` (from auth.users) ≤ 14 days ago
- AND any of the following is false:
  - Has at least 1 family member
  - Has at least 1 class
  - Has at least 5 attendance records

**Goal:** Get user to 1-1-5 (1 family member, 1 class, 5 attendance records)

**Graduation:** User reaches 1-1-5 OR 14 days pass (then moves to "Never Tried" if still incomplete)

---

#### 2. Never Tried
**Definition:** User installed app 30+ days ago but never added a family member

**Criteria:**
- `created_at` ≥ 30 days ago
- AND `family_members` count = 0

**Goal:** Convert to active user by reaching 1-1-5

**Graduation:** User adds first family member (moves to "Gather More Info" or "Engage")

**Expiration:** After 60 days of no activity, stop sending notifications (user considered churned)

---

#### 3. Gather More Info
**Definition:** User has at least 1 class added in last 30 days but incomplete setup

**Criteria:**
- Has at least 1 class where `created_at` ≤ 30 days ago (class is still "recent")
- AND for that class, any of:
  - `schedule` is NULL or empty array
  - No payments recorded (count from `payments` table)
  - Less than 3 attendance records

**Goal:** Complete class setup (add schedule, record payment, mark attendance)

**Graduation:** Class has schedule + at least 1 payment + at least 5 attendance records

---

#### 4. Engage
**Definition:** User has at least 1 class added in last 30 days with active engagement

**Criteria:**
- Has at least 1 class where `created_at` ≤ 30 days ago (class is still "recent")
- AND that class has:
  - Schedule is set (`schedule` array has ≥ 1 item)
  - At least 5 attendance records total

**Goal:** Keep user engaged through reminders and celebrations

**Graduation:** N/A (ongoing cohort, users remain here as long as active)

**Demotion:** If no attendance marked for 30 days, moves to "Reactivate"

---

#### 5. Reactivate
**Definition:** User with historical engagement but now dormant

**Criteria:**
- Has at least 5 total attendance records (proves past engagement)
- AND no attendance marked in last 30 days
- AND at least 1 class exists

**Goal:** Re-engage user to start marking attendance again

**Graduation:** User marks attendance (moves back to "Engage")

**Expiration:** After 60 days of no attendance, stop reactivation attempts

---

### Cohort Priority System

When a user qualifies for multiple cohorts (e.g., has multiple classes in different states), agents prioritize in this order:

1. **Alerts** (highest priority - time-sensitive issues)
2. **Engage** (upcoming scheduled class reminders)
3. **Reactivate** (trying to win back user)
4. **Gather More Info** (nudging incomplete setup)
5. **New User Onboarding** (guiding new users)
6. **Never Tried** (lowest priority - cold leads)

**Rule:** Only send 1 notification per evaluation cycle (per user). The highest-priority agent that has a valid action wins.

---

### Cohort Calculation Query

**Supabase Edge Function: `calculate-user-cohort.ts`**

```sql
-- Calculate cohort for a specific user
WITH user_stats AS (
  SELECT
    u.id as user_id,
    u.created_at as user_created_at,
    COALESCE(fm.member_count, 0) as family_member_count,
    COALESCE(c.class_count, 0) as class_count,
    COALESCE(a.attendance_count, 0) as total_attendance_count,
    COALESCE(a.last_attendance_date, NULL) as last_attendance_date,
    COALESCE(a.recent_attendance_count, 0) as recent_attendance_count
  FROM auth.users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) as member_count
    FROM family_members
    GROUP BY user_id
  ) fm ON fm.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as class_count
    FROM classes
    GROUP BY user_id
  ) c ON c.user_id = u.id
  LEFT JOIN (
    SELECT
      ca.user_id,
      COUNT(*) as attendance_count,
      MAX(ca.class_date) as last_attendance_date,
      COUNT(*) FILTER (WHERE ca.created_at >= NOW() - INTERVAL '30 days') as recent_attendance_count
    FROM class_attendance ca
    GROUP BY ca.user_id
  ) a ON a.user_id = u.id
  WHERE u.id = $1
)
SELECT
  user_id,
  CASE
    -- New User Onboarding
    WHEN user_created_at >= NOW() - INTERVAL '14 days'
      AND (family_member_count = 0 OR class_count = 0 OR total_attendance_count < 5)
    THEN 'new_user_onboarding'

    -- Never Tried
    WHEN user_created_at <= NOW() - INTERVAL '30 days'
      AND family_member_count = 0
    THEN 'never_tried'

    -- Reactivate
    WHEN total_attendance_count >= 5
      AND (last_attendance_date IS NULL OR last_attendance_date <= NOW() - INTERVAL '30 days')
    THEN 'reactivate'

    -- Engage (has active classes)
    WHEN class_count > 0
      AND recent_attendance_count > 0
    THEN 'engage'

    -- Gather More Info (has classes but low engagement)
    WHEN class_count > 0
    THEN 'gather_more_info'

    -- Default
    ELSE 'unclassified'
  END as primary_cohort,

  user_created_at,
  family_member_count,
  class_count,
  total_attendance_count,
  last_attendance_date,
  recent_attendance_count
FROM user_stats;
```

---

## Marketing Agents

### Agent 1: New User Onboarding Agent

**Mission:** Guide new users to 1-1-5 activation within 14 days

**Target Cohort:** `new_user_onboarding`

**Execution Schedule:** Daily at 10 AM user's local time

**Decision Logic:**

```typescript
interface OnboardingAgent {
  evaluateUser(userId: string): Promise<AgentDecision>;
}

async function evaluateUser(userId: string): Promise<AgentDecision> {
  const user = await getUserProfile(userId);
  const daysSinceInstall = getDaysSince(user.created_at);
  const lastNotification = await getLastNotificationForAgent(userId, 'onboarding');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  // Only send on Days 1, 3, 7, 14
  const notificationDays = [1, 3, 7, 14];
  if (!notificationDays.includes(daysSinceInstall)) {
    return { action: 'skip', reason: 'Not a notification day' };
  }

  // Don't send duplicate on same day
  if (daysSinceLastNotification < 1) {
    return { action: 'skip', reason: 'Already sent today' };
  }

  // Check current progress
  const progress = await getOnboardingProgress(userId);

  // Get variant for A/B testing (rotate between 3 message variants)
  const notificationCount = await getNotificationCount(userId, 'onboarding');
  const messageVariant = notificationCount % 3; // 3 different message angles

  // Day 1: Welcome + Add first family member
  if (daysSinceInstall === 1 && progress.family_members === 0) {
    return {
      action: 'send_notification',
      message: generateMessage(`day1_welcome_variant_${messageVariant}`, user),
      deepLink: 'recur://add-family-member',
      priority: 'medium',
      metadata: { variant: messageVariant }
    };
  }

  // Day 3: Remind to add family member OR add class
  if (daysSinceInstall === 3) {
    if (progress.family_members === 0) {
      return {
        action: 'send_notification',
        message: generateMessage(`day3_add_member_variant_${messageVariant}`, user),
        deepLink: 'recur://add-family-member',
        priority: 'medium',
        metadata: { variant: messageVariant }
      };
    } else if (progress.classes === 0) {
      return {
        action: 'send_notification',
        message: generateMessage(`day3_add_class_variant_${messageVariant}`, user, progress),
        deepLink: 'recur://add-class',
        priority: 'medium',
        metadata: { variant: messageVariant }
      };
    }
  }

  // Day 7: Progress check + encourage attendance tracking
  if (daysSinceInstall === 7) {
    if (progress.attendance_count < 5) {
      return {
        action: 'send_notification',
        message: generateMessage('day7_mark_attendance', user, progress),
        deepLink: 'recur://home',
        priority: 'medium'
      };
    }
  }

  // Day 14: Final push OR celebration
  if (daysSinceInstall === 14) {
    if (progress.attendance_count < 5) {
      return {
        action: 'send_notification',
        message: generateMessage('day14_final_push', user, progress),
        deepLink: 'recur://home',
        priority: 'low'
      };
    } else {
      // Celebrate reaching 1-1-5!
      return {
        action: 'send_notification',
        message: generateMessage('day14_celebration', user),
        deepLink: 'recur://analytics',
        priority: 'low'
      };
    }
  }

  return { action: 'skip', reason: 'No action needed' };
}
```

**Notification Messages (with A/B Test Variants):**

**Day 1 - No Family Member Added**

| Variant | Title | Body | Angle |
|---------|-------|------|-------|
| 0 - Value Prop | "Your classes, organized" | "Stop losing track of schedules and payments. Set up a profile for yourself or your family member in 30 seconds." | Pain point + quick win |
| 1 - Social Proof | "Join organized parents" | "Thousands of parents track classes with Recur. Add your first class to get started." | FOMO + community |
| 2 - Outcome Focus | "See your true cost per class" | "Find out exactly what you're paying per session. Add your class to unlock insights." | Curiosity + value |

**Day 3 - No Family Member Added**

| Variant | Title | Body | Angle |
|---------|-------|------|-------|
| 0 - Time Saving | "Never miss a payment again" | "Parents save hours with Recur. Add your first family member and see why." | Benefit + social proof |
| 1 - Money Focus | "Stop overpaying for classes" | "Know exactly what each class costs. Set up takes 30 seconds." | Financial pain point |
| 2 - Simplicity | "Spreadsheets are so 2020" | "Track everything in one beautifully simple app. Add your first family member now." | Modern + easy |

**Day 3 - No Class Added**

| Variant | Title | Body | Angle |
|---------|-------|------|-------|
| 0 - Progress | "See your progress at a glance" | "Great start! Add {MemberName}'s first class to unlock attendance tracking." | Encouragement + unlock |
| 1 - Insights | "Unlock your class insights" | "You're one step away! Add a class for {MemberName} to see spending trends." | Near completion |
| 2 - Quick Win | "Almost there, {FirstName}" | "Add {MemberName}'s class and start tracking attendance today. Takes 60 seconds." | Personal + speed |

**Day 7 - Low Attendance**

| Variant | Title | Body | Angle |
|---------|-------|------|-------|
| 0 - Visual | "Your week in one view" | "You've added {ClassCount} class(es). Mark a few sessions to see your trends come to life." | Visualization |
| 1 - Habit | "Build your tracking habit" | "Mark your recent classes now. It gets easier every time you do it." | Consistency |
| 2 - Value | "See what you're really paying" | "{ClassCount} classes added. Mark attendance to calculate your cost per session." | ROI focus |

**Day 14 - Incomplete (Not Yet Reached 1-1-5)**

| Variant | Title | Body | Angle |
|---------|-------|------|-------|
| 0 - Progress Bar | "Get the full picture" | "You're {X}% there! Track a few more sessions to unlock insights on your class spending." | Gamification |
| 1 - Near Win | "So close!" | "Just {Y} more sessions to see your full attendance analytics. You've got this!" | Encouragement |
| 2 - Value Tease | "Unlock premium insights" | "Track {Y} more sessions to see cost-per-class, attendance streaks, and spending trends." | Feature reveal |

**Day 14 - Complete (Reached 1-1-5)**

| Variant | Title | Body | Angle |
|---------|-------|------|-------|
| ALL | "You're crushing it! 🎉" | "{X} classes tracked in 2 weeks. Check out how much you're saving per class." | Celebration + value |

---

**Copywriting Strategy:**

Each variant tests a different psychological trigger:

1. **Variant 0** - Practical benefit (time saving, organization, visibility)
2. **Variant 1** - Emotional/social (FOMO, community, habit building, personal achievement)
3. **Variant 2** - Financial value (ROI, cost insights, money saved)

**Key Principles Applied:**
- ✅ Lead with benefit, not feature ("Your week in one view" vs "Mark attendance")
- ✅ Use concrete numbers and timeframes ("30 seconds", "{X} classes")
- ✅ Create curiosity gaps ("Find out exactly...", "Unlock insights...")
- ✅ Reference pain points ("Stop overpaying", "Never lose track")
- ✅ Personalize with user data ({FirstName}, {MemberName}, {ClassCount})
- ✅ Include social proof ("Thousands of parents", "Recur users...")
- ✅ Keep it conversational and warm, not corporate
- ✅ One clear call to action per message

**Measurement:**
Track open rate and action rate by variant to identify winning messages. After 1000 sends per variant, the system can auto-optimize by sending the highest-performing variant more frequently.

---

### Agent 2: Never Tried Agent

**Mission:** Convert users who installed but never engaged

**Target Cohort:** `never_tried`

**Execution Schedule:** Every 3 days at 11 AM user's local time

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  const user = await getUserProfile(userId);
  const daysSinceInstall = getDaysSince(user.created_at);
  const lastNotification = await getLastNotificationForAgent(userId, 'never_tried');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  // Only send every 3 days to avoid spam
  if (daysSinceLastNotification < 3) {
    return { action: 'skip', reason: 'Too soon since last notification' };
  }

  // Stop after 60 days of no activity
  if (daysSinceInstall > 60) {
    return { action: 'skip', reason: 'User considered churned' };
  }

  // Check if they've taken any action since last notification
  const recentActivity = await getActivitySince(userId, lastNotification?.sent_at || user.created_at);
  if (recentActivity.length > 0) {
    return { action: 'skip', reason: 'User showed activity, will be picked up by another agent' };
  }

  // Rotate between different message angles
  const notificationCount = await getNotificationCount(userId, 'never_tried');
  const messageVariant = notificationCount % 3; // 3 different messages

  return {
    action: 'send_notification',
    message: generateMessage(`never_tried_variant_${messageVariant}`, user),
    deepLink: 'recur://add-family-member',
    priority: 'low'
  };
}
```

**Notification Messages:**

| Variant | Title | Body | Deep Link |
|---------|-------|------|-----------|
| Variant 0 - Value | "Never lose track again" | "Stop using spreadsheets. Track all your classes in one beautifully simple app." | `add-family-member` |
| Variant 1 - Time-saving | "Save time, stay organized" | "Recur users track attendance in seconds. Join them and get organized today." | `add-family-member` |
| Variant 2 - Social proof | "Join 1,000+ organized parents" | "Parents love Recur for tracking their kids' classes. Get started in 30 seconds." | `add-family-member` |

---

### Agent 3: Gather More Info Agent

**Mission:** Nudge users to complete class setup (schedule, payments)

**Target Cohort:** `gather_more_info`

**Execution Schedule:** Every 5 days at 12 PM user's local time

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  const classes = await getClassesForUser(userId);
  const incompleteClasses = [];

  for (const classItem of classes) {
    const daysSinceCreated = getDaysSince(classItem.created_at);
    if (daysSinceCreated > 30) continue; // Only nudge for recent classes

    const hasSchedule = classItem.schedule && classItem.schedule.length > 0;
    const paymentCount = await getPaymentCount(classItem.id);
    const attendanceCount = await getAttendanceCount(classItem.id);

    if (!hasSchedule || paymentCount === 0 || attendanceCount < 3) {
      incompleteClasses.push({
        class: classItem,
        missing: {
          schedule: !hasSchedule,
          payment: paymentCount === 0,
          attendance: attendanceCount < 3
        }
      });
    }
  }

  if (incompleteClasses.length === 0) {
    return { action: 'skip', reason: 'All classes complete' };
  }

  // Check notification frequency
  const lastNotification = await getLastNotificationForAgent(userId, 'gather_more_info');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  if (daysSinceLastNotification < 5) {
    return { action: 'skip', reason: 'Too soon since last notification' };
  }

  // Pick the most incomplete class
  const targetClass = incompleteClasses[0];

  // Prioritize: schedule > payment > attendance
  if (targetClass.missing.schedule) {
    return {
      action: 'send_notification',
      message: generateMessage('add_schedule', targetClass.class),
      deepLink: `recur://class/${targetClass.class.id}/edit`,
      priority: 'medium'
    };
  } else if (targetClass.missing.payment) {
    return {
      action: 'send_notification',
      message: generateMessage('record_payment', targetClass.class),
      deepLink: `recur://class/${targetClass.class.id}/record-payment`,
      priority: 'medium'
    };
  } else {
    return {
      action: 'send_notification',
      message: generateMessage('mark_more_attendance', targetClass.class),
      deepLink: `recur://class/${targetClass.class.id}`,
      priority: 'low'
    };
  }
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| No schedule | "Never miss {ClassName} again" | "Add a schedule for {ClassName} and we'll remind you before each session." | `class/{id}/edit` |
| No payment | "What's {ClassName} really costing?" | "Record your payment to see your actual cost per class. Takes 20 seconds." | `class/{id}/record-payment` |
| Low attendance | "Complete the picture" | "Mark a few {ClassName} sessions to unlock your attendance insights." | `class/{id}` |

---

### Agent 4: Engage Agent

**Mission:** Keep active users engaged through reminders and celebrations

**Target Cohort:** `engage`

**Execution Schedule:**
- **Upcoming class reminders:** 1 hour before scheduled class time
- **Post-class reminders:** 2 hours after scheduled class time (if not marked)
- **Celebrations:** Weekly on Sunday at 6 PM

**Decision Logic:**

```typescript
async function evaluateUser(userId: string, evaluationTime: Date): Promise<AgentDecision> {
  const classes = await getClassesWithSchedules(userId);
  const decisions: AgentDecision[] = [];

  // Check for upcoming classes (within next 1 hour)
  for (const classItem of classes) {
    if (!classItem.schedule || classItem.schedule.length === 0) continue;

    const nextScheduledTime = getNextScheduledTime(classItem.schedule, evaluationTime);
    const minutesUntilClass = getMinutesUntil(nextScheduledTime);

    // Send reminder 1 hour before (with 5-minute tolerance)
    if (minutesUntilClass >= 55 && minutesUntilClass <= 65) {
      const alreadyNotified = await checkRecentNotification(userId, 'pre_class_reminder', classItem.id, 2); // within 2 hours
      if (!alreadyNotified) {
        decisions.push({
          action: 'send_notification',
          message: generateMessage('pre_class_reminder', classItem, nextScheduledTime),
          deepLink: `recur://class/${classItem.id}`,
          priority: 'high',
          agentType: 'pre_class_reminder'
        });
      }
    }
  }

  // Check for missed attendance (2 hours after scheduled time)
  for (const classItem of classes) {
    if (!classItem.schedule || classItem.schedule.length === 0) continue;

    const lastScheduledTime = getLastScheduledTime(classItem.schedule, evaluationTime);
    const hoursSinceClass = getHoursSince(lastScheduledTime);

    // Check if attendance was marked for this scheduled time
    if (hoursSinceClass >= 2 && hoursSinceClass <= 3) {
      const attendanceMarked = await checkAttendanceMarked(classItem.id, lastScheduledTime);
      if (!attendanceMarked) {
        const alreadyNotified = await checkRecentNotification(userId, 'post_class_reminder', classItem.id, 6); // within 6 hours
        if (!alreadyNotified) {
          decisions.push({
            action: 'send_notification',
            message: generateMessage('post_class_reminder', classItem),
            deepLink: `recur://class/${classItem.id}`,
            priority: 'medium',
            agentType: 'post_class_reminder'
          });
        }
      }
    }
  }

  // Check for streak celebrations (weekly on Sunday evening)
  const dayOfWeek = evaluationTime.getDay();
  const hourOfDay = evaluationTime.getHours();

  if (dayOfWeek === 0 && hourOfDay === 18) { // Sunday 6 PM
    const lastWeekCelebration = await getLastNotificationForAgent(userId, 'celebration');
    const daysSinceCelebration = lastWeekCelebration ? getDaysSince(lastWeekCelebration.sent_at) : 999;

    if (daysSinceCelebration >= 7) {
      const weeklyStats = await getWeeklyAttendanceStats(userId);

      // Celebrate streaks
      if (weeklyStats.consecutiveWeeks >= 4) {
        decisions.push({
          action: 'send_notification',
          message: generateMessage('streak_celebration', { weeks: weeklyStats.consecutiveWeeks }),
          deepLink: 'recur://analytics',
          priority: 'low',
          agentType: 'celebration'
        });
      }

      // Celebrate milestones
      else if (weeklyStats.totalAttendanceAllTime % 25 === 0 && weeklyStats.totalAttendanceAllTime > 0) {
        decisions.push({
          action: 'send_notification',
          message: generateMessage('milestone_celebration', { count: weeklyStats.totalAttendanceAllTime }),
          deepLink: 'recur://analytics',
          priority: 'low',
          agentType: 'celebration'
        });
      }

      // Weekly summary
      else if (weeklyStats.classesThisWeek > 0) {
        decisions.push({
          action: 'send_notification',
          message: generateMessage('weekly_summary', weeklyStats),
          deepLink: 'recur://analytics',
          priority: 'low',
          agentType: 'celebration'
        });
      }
    }
  }

  // Return highest priority decision
  if (decisions.length === 0) {
    return { action: 'skip', reason: 'No actions needed' };
  }

  return decisions.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority))[0];
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| Pre-class (1hr before) | "{ClassName} in 1 hour" | "Your {ClassName} class with {Instructor} starts at {Time}. See you there!" | `class/{id}` |
| Post-class (2hr after) | "Did you attend {ClassName}?" | "Don't forget to mark your attendance for today's {ClassName} session!" | `class/{id}` |
| 4-week streak | "4 weeks strong! 🔥" | "You've marked attendance for {ClassName} 4 weeks in a row. Keep it up!" | `analytics` |
| Milestone (25, 50, 100) | "{X} classes tracked! 🎉" | "You've tracked {X} classes total. Amazing consistency!" | `analytics` |
| Weekly summary | "Your week in classes" | "You attended {X} classes this week. Total this month: {Y}." | `analytics` |

---

### Agent 5: Alert Agent

**Mission:** Notify users of important account states requiring attention

**Target Cohort:** All cohorts (cross-cutting)

**Execution Schedule:** Daily at 9 AM user's local time

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  const classes = await getClassesForUser(userId);
  const alerts: AgentDecision[] = [];

  // Check each class for alert conditions
  for (const classItem of classes) {
    // Alert 1: Low prepaid balance (< 3 classes remaining)
    const balance = await getPrepaidBalance(classItem.id);
    if (balance.remaining < 3 && balance.remaining >= 0) {
      const lastAlert = await getLastNotificationForAgent(userId, 'low_balance_alert', classItem.id);
      const daysSinceLastAlert = lastAlert ? getDaysSince(lastAlert.sent_at) : 999;

      // Send once when hitting threshold, then weekly reminder
      if (!lastAlert || daysSinceLastAlert >= 7) {
        alerts.push({
          action: 'send_notification',
          message: generateMessage('low_balance', classItem, balance),
          deepLink: `recur://class/${classItem.id}/record-payment`,
          priority: 'high',
          agentType: 'low_balance_alert',
          metadata: { class_id: classItem.id }
        });
      }
    }

    // Alert 2: Negative balance (attended more than paid)
    if (balance.remaining < 0) {
      const lastAlert = await getLastNotificationForAgent(userId, 'negative_balance_alert', classItem.id);
      const daysSinceLastAlert = lastAlert ? getDaysSince(lastAlert.sent_at) : 999;

      if (!lastAlert || daysSinceLastAlert >= 7) {
        alerts.push({
          action: 'send_notification',
          message: generateMessage('negative_balance', classItem, balance),
          deepLink: `recur://class/${classItem.id}/record-payment`,
          priority: 'high',
          agentType: 'negative_balance_alert',
          metadata: { class_id: classItem.id }
        });
      }
    }

    // Alert 3: Consecutive missed classes (3-4 weeks with schedule but no attendance)
    if (classItem.schedule && classItem.schedule.length > 0) {
      const missedWeeks = await getConsecutiveMissedWeeks(classItem.id);

      if (missedWeeks >= 3) {
        const lastAlert = await getLastNotificationForAgent(userId, 'missed_classes_alert', classItem.id);
        const daysSinceLastAlert = lastAlert ? getDaysSince(lastAlert.sent_at) : 999;

        if (!lastAlert || daysSinceLastAlert >= 7) {
          alerts.push({
            action: 'send_notification',
            message: generateMessage('consecutive_missed', classItem, missedWeeks),
            deepLink: `recur://class/${classItem.id}`,
            priority: 'high',
            agentType: 'missed_classes_alert',
            metadata: { class_id: classItem.id, weeks: missedWeeks }
          });
        }
      }
    }
  }

  // Return highest priority alert
  if (alerts.length === 0) {
    return { action: 'skip', reason: 'No alerts' };
  }

  return alerts[0];
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| Low balance (< 3) | "Low balance: {ClassName}" | "You have {X} prepaid classes left for {ClassName}. Record your next payment?" | `class/{id}/record-payment` |
| Negative balance | "Payment needed: {ClassName}" | "You've attended {X} more classes than paid for {ClassName}. Update your records?" | `class/{id}/record-payment` |
| Missed 3 weeks | "Is {ClassName} still active?" | "No attendance marked for {ClassName} in 3 weeks. Still taking this class?" | `class/{id}` |
| Missed 4 weeks | "Update {ClassName} status?" | "It's been 4 weeks since {ClassName} attendance. Consider updating or removing?" | `class/{id}` |

---

### Agent 6: Reactivate Agent

**Mission:** Win back users who stopped tracking attendance

**Target Cohort:** `reactivate`

**Execution Schedule:** Every 7 days at 10 AM user's local time

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  const user = await getUserProfile(userId);
  const daysSinceLastAttendance = await getDaysSinceLastAttendance(userId);

  // Stop after 60 days of inactivity
  if (daysSinceLastAttendance > 60) {
    return { action: 'skip', reason: 'User considered churned' };
  }

  // Check notification frequency
  const lastNotification = await getLastNotificationForAgent(userId, 'reactivate');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  if (daysSinceLastNotification < 7) {
    return { action: 'skip', reason: 'Too soon since last notification' };
  }

  // Get their most active class
  const topClass = await getMostAttendedClass(userId);
  const prepaidBalance = await getPrepaidBalance(topClass.id);

  // Calculate stored value
  const storedValue = prepaidBalance.remaining * prepaidBalance.averageCostPerClass;

  return {
    action: 'send_notification',
    message: generateMessage('reactivate', topClass, prepaidBalance, storedValue),
    deepLink: `recur://class/${topClass.id}`,
    priority: 'medium'
  };
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| 30 days inactive | "We miss you!" | "It's been a while since you tracked {ClassName}. You have {X} prepaid classes worth {Currency}{Amount}!" | `class/{id}` |
| 45 days inactive | "Don't lose track" | "You've tracked {X} classes in the past. Keep your records up to date!" | `home` |

---

## Agent Orchestration

### Orchestrator Logic

The **Agent Orchestrator** is a Supabase Edge Function that runs every hour and coordinates all marketing agents.

**File:** `supabase/functions/agent-orchestrator/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Import all agents
import { NewUserOnboardingAgent } from './agents/new-user-onboarding.ts';
import { NeverTriedAgent } from './agents/never-tried.ts';
import { GatherMoreInfoAgent } from './agents/gather-more-info.ts';
import { EngageAgent } from './agents/engage.ts';
import { AlertAgent } from './agents/alert.ts';
import { ReactivateAgent } from './agents/reactivate.ts';

interface AgentDecision {
  action: 'send_notification' | 'skip';
  reason?: string;
  message?: {
    title: string;
    body: string;
  };
  deepLink?: string;
  priority: 'high' | 'medium' | 'low';
  agentType?: string;
  metadata?: Record<string, any>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const evaluationTime = new Date();
    const hourOfDay = evaluationTime.getHours();

    console.log(`[Orchestrator] Starting evaluation at ${evaluationTime.toISOString()}`);

    // Get all users (with pagination for scale)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    console.log(`[Orchestrator] Evaluating ${users.users.length} users`);

    let notificationsSent = 0;
    let usersProcessed = 0;
    let decisionsLogged = 0;

    // Process each user
    for (const user of users.users) {
      try {
        // Check if user has push token (skip if no token)
        const { data: pushToken } = await supabase
          .from('user_push_tokens')
          .select('expo_push_token')
          .eq('user_id', user.id)
          .single();

        if (!pushToken?.expo_push_token) {
          console.log(`[Orchestrator] User ${user.id} has no push token, skipping`);
          continue;
        }

        // Check notification frequency cap (max 2 per day)
        const notificationsToday = await getNotificationCountToday(supabase, user.id);
        if (notificationsToday >= 2) {
          console.log(`[Orchestrator] User ${user.id} already received 2 notifications today, skipping`);
          continue;
        }

        // Check quiet hours (10 PM - 8 AM)
        const userTimezone = await getUserTimezone(supabase, user.id); // Default to UTC if not set
        const userLocalHour = getUserLocalHour(evaluationTime, userTimezone);

        if (userLocalHour >= 22 || userLocalHour < 8) {
          console.log(`[Orchestrator] User ${user.id} in quiet hours (${userLocalHour}:00), skipping`);
          continue;
        }

        // Calculate user's cohort
        const cohort = await calculateUserCohort(supabase, user.id);

        // Evaluate agents in priority order
        const agents = [
          { name: 'alert', agent: new AlertAgent(supabase), priority: 1 },
          { name: 'engage', agent: new EngageAgent(supabase), priority: 2 },
          { name: 'reactivate', agent: new ReactivateAgent(supabase), priority: 3 },
          { name: 'gather_more_info', agent: new GatherMoreInfoAgent(supabase), priority: 4 },
          { name: 'new_user_onboarding', agent: new NewUserOnboardingAgent(supabase), priority: 5 },
          { name: 'never_tried', agent: new NeverTriedAgent(supabase), priority: 6 },
        ];

        let notificationSent = false;

        for (const { name, agent } of agents) {
          const decision = await agent.evaluateUser(user.id, evaluationTime, cohort);

          // Log decision
          await logAgentDecision(supabase, {
            user_id: user.id,
            agent_name: name,
            decision: decision.action,
            reason: decision.reason,
            priority: decision.priority,
            metadata: decision.metadata,
          });
          decisionsLogged++;

          // If agent wants to send notification, do it and stop
          if (decision.action === 'send_notification' && !notificationSent) {
            await sendNotification(supabase, {
              user_id: user.id,
              agent_name: name,
              title: decision.message!.title,
              body: decision.message!.body,
              deep_link: decision.deepLink,
              priority: decision.priority,
              push_token: pushToken.expo_push_token,
            });

            notificationsSent++;
            notificationSent = true;
            break; // Only one notification per user per cycle
          }
        }

        usersProcessed++;
      } catch (userError) {
        console.error(`[Orchestrator] Error processing user ${user.id}:`, userError);
        // Continue with next user
      }
    }

    console.log(`[Orchestrator] Completed: ${usersProcessed} users processed, ${notificationsSent} notifications sent, ${decisionsLogged} decisions logged`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluation_time: evaluationTime.toISOString(),
        users_processed: usersProcessed,
        notifications_sent: notificationsSent,
        decisions_logged: decisionsLogged,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper functions
async function getNotificationCountToday(supabase: any, userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('notification_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', today.toISOString());

  return count || 0;
}

async function getUserTimezone(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_preferences')
    .select('timezone')
    .eq('user_id', userId)
    .single();

  return data?.timezone || 'UTC';
}

function getUserLocalHour(utcTime: Date, timezone: string): number {
  // Convert UTC time to user's local time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });

  return parseInt(formatter.format(utcTime));
}

async function calculateUserCohort(supabase: any, userId: string): Promise<string> {
  // Run cohort calculation SQL query
  const { data, error } = await supabase.rpc('calculate_user_cohort', { user_id: userId });

  if (error) throw error;

  return data[0]?.primary_cohort || 'unclassified';
}

async function logAgentDecision(supabase: any, decision: any): Promise<void> {
  await supabase.from('agent_decisions').insert({
    user_id: decision.user_id,
    agent_name: decision.agent_name,
    decision_type: decision.decision,
    reason: decision.reason,
    priority: decision.priority,
    metadata: decision.metadata,
    evaluated_at: new Date().toISOString(),
  });
}

async function sendNotification(supabase: any, notification: any): Promise<void> {
  // Send via Expo Push API
  const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

  const pushMessage = {
    to: notification.push_token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: {
      deep_link: notification.deep_link,
      agent_name: notification.agent_name,
    },
    priority: notification.priority === 'high' ? 'high' : 'default',
  };

  const response = await fetch(expoPushEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pushMessage),
  });

  const result = await response.json();

  // Log notification in database
  await supabase.from('notification_history').insert({
    user_id: notification.user_id,
    agent_name: notification.agent_name,
    title: notification.title,
    body: notification.body,
    deep_link: notification.deep_link,
    priority: notification.priority,
    sent_at: new Date().toISOString(),
    expo_push_token: notification.push_token,
    expo_ticket_id: result.data?.[0]?.id,
    delivery_status: result.data?.[0]?.status === 'ok' ? 'sent' : 'failed',
  });
}
```

### Orchestrator Scheduling

**Cron Schedule:** Every hour (0 * * * *)

**Supabase Cron Job Configuration:**

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule orchestrator to run every hour
SELECT cron.schedule(
  'agent-orchestrator-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/agent-orchestrator',
      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

---

## Push Notification System

### Expo Push Notifications Setup

**Dependencies:**
- `expo-notifications` (already installed)
- Expo Push API endpoint: `https://exp.host/--/api/v2/push/send`

### Mobile App Integration

**File:** `shared/services/pushNotifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../api/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    // Save token to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_push_tokens').upsert({
        user_id: user.id,
        expo_push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export function setupNotificationListeners() {
  // Handle notification received while app is foregrounded
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Handle notification tapped
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);

    const { deep_link, agent_name } = response.notification.request.content.data;

    // Track notification open
    trackNotificationOpened(response.notification.request.identifier, agent_name);

    // Handle deep link navigation
    if (deep_link) {
      handleDeepLink(deep_link);
    }
  });
}

async function trackNotificationOpened(notificationId: string, agentName: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update notification history with opened status
    await supabase
      .from('notification_history')
      .update({
        opened_at: new Date().toISOString(),
        was_opened: true,
      })
      .eq('user_id', user.id)
      .eq('expo_ticket_id', notificationId);

    // Track in activity log
    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      event_type: 'notification_opened',
      event_data: {
        notification_id: notificationId,
        agent_name: agentName,
      },
    });
  } catch (error) {
    console.error('Error tracking notification open:', error);
  }
}

function handleDeepLink(deepLink: string) {
  // Parse deep link and navigate
  // Format: recur://screen-name or recur://class/123
  const url = deepLink.replace('recur://', '');

  // Navigation logic handled by React Navigation
  // This will be implemented in App.tsx using Linking API
  console.log('Navigating to:', url);
}
```

**App.tsx Integration:**

```typescript
import { useEffect } from 'react';
import { registerForPushNotifications, setupNotificationListeners } from './shared/services/pushNotifications';

export default function App() {
  useEffect(() => {
    // Register for push notifications after user logs in
    const initializePushNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Wait until user completes 1-1-5 before asking for permission
        const progress = await getOnboardingProgress(session.user.id);

        if (progress.has_reached_1_1_5) {
          const token = await registerForPushNotifications();
          if (token) {
            console.log('Push notifications enabled');
          }
        }
      }
    };

    initializePushNotifications();
    setupNotificationListeners();
  }, []);

  return <NavigationContainer>{/* ... */}</NavigationContainer>;
}
```

### Deep Link Handling

**Supported Deep Links:**

| Deep Link | Destination | Use Case |
|-----------|-------------|----------|
| `recur://home` | Home Screen | General app open |
| `recur://add-family-member` | Add Family Member Screen | Onboarding nudges |
| `recur://add-class` | Add Class Screen | Class creation nudges |
| `recur://class/{id}` | Class Detail Screen | Class-specific actions |
| `recur://class/{id}/edit` | Edit Class Screen | Schedule setup |
| `recur://class/{id}/record-payment` | Record Payment Screen | Payment reminders |
| `recur://analytics` | Analytics Screen | Celebrations |

---

## Database Schema

### New Tables for Marketing Agents

#### 1. user_activity_log
**Purpose:** Track all user actions for behavior analysis

```sql
CREATE TABLE user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'app_opened', 'family_member_added', etc.
  event_data JSONB, -- Additional event-specific data
  session_id TEXT, -- Groups events by session
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_event_type ON user_activity_log(event_type);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at DESC);

-- RLS Policies
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

#### 2. user_engagement_metrics
**Purpose:** Aggregated metrics for fast agent evaluation

```sql
CREATE TABLE user_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Onboarding progress
  has_family_member BOOLEAN DEFAULT FALSE,
  family_member_count INTEGER DEFAULT 0,
  has_class BOOLEAN DEFAULT FALSE,
  class_count INTEGER DEFAULT 0,
  total_attendance_count INTEGER DEFAULT 0,
  has_reached_1_1_5 BOOLEAN DEFAULT FALSE, -- 1 member, 1 class, 5 attendance

  -- Engagement timestamps
  last_app_open_at TIMESTAMPTZ,
  last_family_member_added_at TIMESTAMPTZ,
  last_class_added_at TIMESTAMPTZ,
  last_attendance_marked_at TIMESTAMPTZ,
  last_payment_recorded_at TIMESTAMPTZ,

  -- Activity metrics (rolling 30 days)
  app_opens_last_30_days INTEGER DEFAULT 0,
  attendance_marked_last_30_days INTEGER DEFAULT 0,
  payments_recorded_last_30_days INTEGER DEFAULT 0,

  -- Calculated cohort
  primary_cohort TEXT, -- 'new_user_onboarding', 'engage', etc.
  cohort_calculated_at TIMESTAMPTZ,

  -- Lifecycle stage
  lifecycle_stage TEXT, -- 'new', 'active', 'at_risk', 'dormant', 'churned'

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_engagement_user_id ON user_engagement_metrics(user_id);
CREATE INDEX idx_user_engagement_cohort ON user_engagement_metrics(primary_cohort);
CREATE INDEX idx_user_engagement_lifecycle ON user_engagement_metrics(lifecycle_stage);

-- RLS Policies
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagement metrics"
  ON user_engagement_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can update (for background jobs)
CREATE POLICY "Service role can update engagement metrics"
  ON user_engagement_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### 3. notification_history
**Purpose:** Track all notifications sent to users

```sql
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'onboarding', 'engage', etc.

  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'

  -- Delivery info
  expo_push_token TEXT,
  expo_ticket_id TEXT, -- Expo's tracking ID
  delivery_status TEXT DEFAULT 'pending', -- 'sent', 'failed', 'pending'

  -- Engagement tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  was_opened BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE, -- Did user complete intended action?
  action_taken_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB, -- Agent-specific data (class_id, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_agent_name ON notification_history(agent_name);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX idx_notification_history_opened ON notification_history(was_opened);

-- RLS Policies
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification history"
  ON notification_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert/update (for background jobs)
CREATE POLICY "Service role can manage notifications"
  ON notification_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### 4. agent_decisions
**Purpose:** Log every agent decision for debugging and optimization

```sql
CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,

  -- Decision details
  decision_type TEXT NOT NULL, -- 'send_notification', 'skip'
  reason TEXT, -- Why this decision was made
  priority TEXT, -- 'high', 'medium', 'low'

  -- Context
  user_cohort TEXT, -- User's cohort at time of evaluation
  metadata JSONB, -- Additional context (class_id, days_since_X, etc.)

  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_decisions_user_id ON agent_decisions(user_id);
CREATE INDEX idx_agent_decisions_agent_name ON agent_decisions(agent_name);
CREATE INDEX idx_agent_decisions_evaluated_at ON agent_decisions(evaluated_at DESC);

-- RLS Policies
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (internal logging)
CREATE POLICY "Service role can manage agent decisions"
  ON agent_decisions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### 5. user_push_tokens
**Purpose:** Store Expo push tokens for each user

```sql
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' or 'android'
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- RLS Policies
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
  ON user_push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own push tokens"
  ON user_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 6. user_preferences
**Purpose:** Store user notification preferences

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start INTEGER DEFAULT 22, -- 10 PM
  quiet_hours_end INTEGER DEFAULT 8, -- 8 AM
  timezone TEXT DEFAULT 'UTC',

  -- Per-agent opt-out
  onboarding_notifications BOOLEAN DEFAULT TRUE,
  engage_notifications BOOLEAN DEFAULT TRUE,
  alert_notifications BOOLEAN DEFAULT TRUE,
  reactivate_notifications BOOLEAN DEFAULT TRUE,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Database Functions

#### Calculate User Cohort Function

```sql
CREATE OR REPLACE FUNCTION calculate_user_cohort(user_id_param UUID)
RETURNS TABLE(
  user_id UUID,
  primary_cohort TEXT,
  user_created_at TIMESTAMPTZ,
  family_member_count INTEGER,
  class_count INTEGER,
  total_attendance_count INTEGER,
  last_attendance_date TIMESTAMPTZ,
  recent_attendance_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      u.id as user_id,
      u.created_at as user_created_at,
      COALESCE(fm.member_count, 0) as family_member_count,
      COALESCE(c.class_count, 0) as class_count,
      COALESCE(a.attendance_count, 0) as total_attendance_count,
      COALESCE(a.last_attendance_date, NULL) as last_attendance_date,
      COALESCE(a.recent_attendance_count, 0) as recent_attendance_count
    FROM auth.users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) as member_count
      FROM family_members
      GROUP BY user_id
    ) fm ON fm.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as class_count
      FROM classes
      GROUP BY user_id
    ) c ON c.user_id = u.id
    LEFT JOIN (
      SELECT
        ca.user_id,
        COUNT(*) as attendance_count,
        MAX(ca.class_date) as last_attendance_date,
        COUNT(*) FILTER (WHERE ca.created_at >= NOW() - INTERVAL '30 days') as recent_attendance_count
      FROM class_attendance ca
      GROUP BY ca.user_id
    ) a ON a.user_id = u.id
    WHERE u.id = user_id_param
  )
  SELECT
    us.user_id,
    CASE
      -- New User Onboarding
      WHEN us.user_created_at >= NOW() - INTERVAL '14 days'
        AND (us.family_member_count = 0 OR us.class_count = 0 OR us.total_attendance_count < 5)
      THEN 'new_user_onboarding'

      -- Never Tried
      WHEN us.user_created_at <= NOW() - INTERVAL '30 days'
        AND us.family_member_count = 0
      THEN 'never_tried'

      -- Reactivate
      WHEN us.total_attendance_count >= 5
        AND (us.last_attendance_date IS NULL OR us.last_attendance_date <= NOW() - INTERVAL '30 days')
      THEN 'reactivate'

      -- Engage (has active classes)
      WHEN us.class_count > 0
        AND us.recent_attendance_count > 0
      THEN 'engage'

      -- Gather More Info (has classes but low engagement)
      WHEN us.class_count > 0
      THEN 'gather_more_info'

      -- Default
      ELSE 'unclassified'
    END as primary_cohort,

    us.user_created_at,
    us.family_member_count,
    us.class_count,
    us.total_attendance_count,
    us.last_attendance_date,
    us.recent_attendance_count
  FROM user_stats us;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Set up database tables
- Implement activity tracking in mobile app
- Build push notification infrastructure

**Tasks:**

1. **Database Setup**
   - Create migration for 6 new tables (user_activity_log, user_engagement_metrics, notification_history, agent_decisions, user_push_tokens, user_preferences)
   - Create calculate_user_cohort() function
   - Test RLS policies

2. **Mobile App - Activity Tracking**
   - Create `shared/utils/analytics.ts` with ActivityTracker class
   - Integrate tracking in App.tsx (app lifecycle)
   - Integrate tracking in CRUD operations (family members, classes, attendance, payments)
   - Test event batching and flush mechanism

3. **Mobile App - Push Notifications**
   - Create `shared/services/pushNotifications.ts`
   - Request permissions after 1-1-5 completion
   - Store Expo push token in user_push_tokens table
   - Set up notification listeners (received, tapped)
   - Implement deep link handling

4. **Testing**
   - Verify activity events are logged correctly
   - Verify push token is stored
   - Test notification delivery end-to-end
   - Test deep link navigation

**Deliverables:**
- ✅ Database schema deployed
- ✅ Activity tracking working in app
- ✅ Push notifications working end-to-end
- ✅ Deep links navigating correctly

---

### Phase 2: Agent Implementation (Week 3-4)

**Goals:**
- Build all 6 marketing agents
- Create agent orchestrator
- Deploy as Supabase Edge Functions

**Tasks:**

1. **Agent Development**
   - Create `supabase/functions/agents/` directory
   - Implement NewUserOnboardingAgent
   - Implement NeverTriedAgent
   - Implement GatherMoreInfoAgent
   - Implement EngageAgent
   - Implement AlertAgent
   - Implement ReactivateAgent
   - Write unit tests for each agent's decision logic

2. **Orchestrator Development**
   - Create `supabase/functions/agent-orchestrator/index.ts`
   - Implement user iteration logic
   - Implement notification frequency capping (2/day)
   - Implement quiet hours (10 PM - 8 AM)
   - Implement agent priority system
   - Add comprehensive logging

3. **Message Generation**
   - Create message templates for all agent triggers
   - Implement personalization (user name, class name, dates, numbers)
   - Test message rendering with various data

4. **Deployment**
   - Deploy all Edge Functions to Supabase
   - Set up cron job to run orchestrator every hour
   - Test full cycle: user action → activity log → metric update → agent evaluation → notification sent

5. **Testing**
   - Create test users in different cohorts
   - Manually trigger orchestrator
   - Verify correct agents evaluate each user
   - Verify correct notifications sent
   - Test notification frequency cap
   - Test quiet hours

**Deliverables:**
- ✅ 6 agents implemented and tested
- ✅ Orchestrator deployed and scheduled
- ✅ Notifications flowing end-to-end
- ✅ All cohorts represented and working

---

### Phase 3: Metrics Processing (Week 5)

**Goals:**
- Build real-time metric calculator
- Keep user_engagement_metrics table up-to-date

**Tasks:**

1. **Metrics Processor Edge Function**
   - Create `supabase/functions/metrics-processor/index.ts`
   - Calculate engagement metrics from activity log
   - Update user_engagement_metrics table
   - Run after each user session (triggered by 'session_ended' event)

2. **Database Triggers**
   - Create trigger on family_members INSERT → update user_engagement_metrics
   - Create trigger on classes INSERT → update user_engagement_metrics
   - Create trigger on class_attendance INSERT → update user_engagement_metrics
   - Create trigger on payments INSERT → update user_engagement_metrics

3. **Cohort Re-calculation**
   - Schedule cohort calculation daily at midnight
   - Update primary_cohort in user_engagement_metrics
   - Log cohort transitions for analysis

4. **Testing**
   - Add family member → verify metrics updated
   - Mark attendance → verify metrics updated
   - Verify cohort transitions (new user → engage)

**Deliverables:**
- ✅ Metrics processor working
- ✅ user_engagement_metrics always fresh
- ✅ Cohort calculation automated

---

### Phase 4: Observability (Week 6)

**Goals:**
- Build admin dashboard for monitoring agents
- Set up alerts for system health

**Tasks:**

1. **Analytics Queries**
   - Create materialized views for agent performance
   - Notification delivery rate by agent
   - Notification open rate by agent
   - Action completion rate by agent
   - Cohort distribution over time

2. **Admin Dashboard (Web)**
   - Create `/admin/agents` page (protected by admin role)
   - Display agent performance metrics
   - Display recent notifications sent
   - Display recent agent decisions
   - Display cohort distribution chart
   - Display user funnel (install → 1-1-5)

3. **Alerts**
   - Alert if orchestrator fails to run
   - Alert if notification delivery rate < 80%
   - Alert if agent decision logging fails
   - Alert if metrics processor fails

4. **Documentation**
   - Write agent runbook (how to debug issues)
   - Write message updating guide (how to change notification copy)
   - Write scaling guide (how to handle 10k+ users)

**Deliverables:**
- ✅ Admin dashboard deployed
- ✅ Alerts configured
- ✅ Documentation complete

---

### Phase 5: Optimization (Week 7-8)

**Goals:**
- A/B test notification messages
- Optimize agent timing and frequency
- Improve engagement rates

**Tasks:**

1. **A/B Testing Framework**
   - Add `message_variant` field to notification_history
   - Implement random variant assignment
   - Create 2-3 variants per agent
   - Track performance by variant

2. **Agent Tuning**
   - Analyze which agents drive most engagement
   - Adjust notification frequency based on data
   - Test different notification times
   - Optimize message copy based on open rates

3. **User Segmentation Refinement**
   - Analyze cohort transition patterns
   - Identify sub-cohorts (e.g., engaged but not recording payments)
   - Create specialized agents for high-value sub-cohorts

4. **Performance Optimization**
   - Optimize database queries
   - Add indexes where needed
   - Batch notification sending
   - Cache frequently accessed data

**Deliverables:**
- ✅ A/B testing framework working
- ✅ Agent performance improved by 20%+
- ✅ System handles 10k+ users efficiently

---

## Observability Infrastructure

### Key Metrics Dashboard

#### Agent Performance Metrics

**Delivery Rate by Agent:**
```sql
SELECT
  agent_name,
  COUNT(*) FILTER (WHERE delivery_status = 'sent') * 100.0 / COUNT(*) as delivery_rate,
  COUNT(*) as total_sent
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_name
ORDER BY delivery_rate DESC;
```

**Open Rate by Agent:**
```sql
SELECT
  agent_name,
  COUNT(*) FILTER (WHERE was_opened = TRUE) * 100.0 / COUNT(*) as open_rate,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE was_opened = TRUE) as total_opened
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
  AND delivery_status = 'sent'
GROUP BY agent_name
ORDER BY open_rate DESC;
```

**Action Rate by Agent:**
```sql
SELECT
  agent_name,
  COUNT(*) FILTER (WHERE action_taken = TRUE) * 100.0 / COUNT(*) as action_rate,
  COUNT(*) FILTER (WHERE action_taken = TRUE) as actions_taken
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
  AND delivery_status = 'sent'
GROUP BY agent_name
ORDER BY action_rate DESC;
```

**Average Time to Open:**
```sql
SELECT
  agent_name,
  AVG(EXTRACT(EPOCH FROM (opened_at - sent_at)) / 60) as avg_minutes_to_open
FROM notification_history
WHERE was_opened = TRUE
  AND sent_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_name
ORDER BY avg_minutes_to_open;
```

---

#### User Engagement Metrics

**Cohort Distribution:**
```sql
SELECT
  primary_cohort,
  COUNT(*) as user_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM user_engagement_metrics
WHERE cohort_calculated_at >= NOW() - INTERVAL '1 day'
GROUP BY primary_cohort
ORDER BY user_count DESC;
```

**1-1-5 Funnel:**
```sql
SELECT
  'Total Users' as stage,
  COUNT(*) as count
FROM user_engagement_metrics
UNION ALL
SELECT
  'Has Family Member' as stage,
  COUNT(*) as count
FROM user_engagement_metrics
WHERE has_family_member = TRUE
UNION ALL
SELECT
  'Has Class' as stage,
  COUNT(*) as count
FROM user_engagement_metrics
WHERE has_class = TRUE
UNION ALL
SELECT
  'Reached 1-1-5' as stage,
  COUNT(*) as count
FROM user_engagement_metrics
WHERE has_reached_1_1_5 = TRUE;
```

**Cohort Transition Tracking:**
```sql
-- Track users moving between cohorts
WITH cohort_history AS (
  SELECT
    user_id,
    primary_cohort,
    cohort_calculated_at,
    LAG(primary_cohort) OVER (PARTITION BY user_id ORDER BY cohort_calculated_at) as previous_cohort
  FROM user_engagement_metrics
  WHERE cohort_calculated_at >= NOW() - INTERVAL '30 days'
)
SELECT
  previous_cohort,
  primary_cohort as current_cohort,
  COUNT(*) as transition_count
FROM cohort_history
WHERE previous_cohort IS NOT NULL
  AND previous_cohort != primary_cohort
GROUP BY previous_cohort, primary_cohort
ORDER BY transition_count DESC;
```

---

#### System Health Metrics

**Orchestrator Runs:**
```sql
-- Track orchestrator execution
CREATE TABLE orchestrator_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  users_processed INTEGER,
  notifications_sent INTEGER,
  decisions_logged INTEGER,
  status TEXT, -- 'success', 'failed', 'partial'
  error_message TEXT
);

-- Query recent runs
SELECT
  started_at,
  completed_at,
  users_processed,
  notifications_sent,
  status
FROM orchestrator_runs
ORDER BY started_at DESC
LIMIT 24; -- Last 24 hours
```

**Notification Delivery Issues:**
```sql
SELECT
  DATE_TRUNC('hour', sent_at) as hour,
  COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed_count,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE delivery_status = 'failed') * 100.0 / COUNT(*) as failure_rate
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', sent_at)
ORDER BY hour DESC;
```

---

### Alerts Configuration

**Alert 1: Orchestrator Failure**
```sql
-- Alert if orchestrator hasn't run in 2+ hours
SELECT
  CASE
    WHEN MAX(started_at) < NOW() - INTERVAL '2 hours' THEN 'CRITICAL'
    ELSE 'OK'
  END as status,
  MAX(started_at) as last_run
FROM orchestrator_runs;
```

**Alert 2: High Notification Failure Rate**
```sql
-- Alert if failure rate > 20% in last hour
SELECT
  COUNT(*) FILTER (WHERE delivery_status = 'failed') * 100.0 / COUNT(*) as failure_rate
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '1 hour'
HAVING COUNT(*) FILTER (WHERE delivery_status = 'failed') * 100.0 / COUNT(*) > 20;
```

**Alert 3: Low Engagement Rate**
```sql
-- Alert if open rate drops below 40% (7-day average)
SELECT
  COUNT(*) FILTER (WHERE was_opened = TRUE) * 100.0 / COUNT(*) as open_rate
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
  AND delivery_status = 'sent'
HAVING COUNT(*) FILTER (WHERE was_opened = TRUE) * 100.0 / COUNT(*) < 40;
```

---

## Edge Cases & Complexities

### Multi-Class State Management

**Problem:** User has 5 classes, each in different state:
- Class A: Schedule set, regular attendance (Engage)
- Class B: No schedule, no attendance for 30 days (Reactivate)
- Class C: Schedule set, missed 3 weeks (Alert)
- Class D: Recently added, no schedule (Gather More Info)
- Class E: Schedule set, low prepaid balance (Alert)

**Solution:** Agent priority system

```typescript
// Each agent evaluates all classes and returns highest-priority action
async function evaluateUser(userId: string): Promise<AgentDecision[]> {
  const classes = await getClassesForUser(userId);
  const decisions: AgentDecision[] = [];

  for (const classItem of classes) {
    const classDecision = await evaluateClass(classItem);
    if (classDecision.action === 'send_notification') {
      decisions.push(classDecision);
    }
  }

  // Sort by priority: high > medium > low
  return decisions.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
}

// Orchestrator picks highest priority across all agents
const allDecisions = [
  await alertAgent.evaluateUser(userId), // Returns alert for Class C (missed 3 weeks)
  await engageAgent.evaluateUser(userId), // Returns reminder for Class A (upcoming)
  await reactivateAgent.evaluateUser(userId), // Returns reactivation for Class B
  await gatherMoreInfoAgent.evaluateUser(userId), // Returns schedule prompt for Class D
];

// Send only the highest priority
const topDecision = allDecisions
  .flat()
  .filter(d => d.action === 'send_notification')
  .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority))[0];
```

**Result:** User receives alert about Class C (highest priority), other classes will be handled in subsequent cycles.

---

### Notification Frequency Capping

**Problem:** User qualifies for multiple notifications (onboarding Day 7 + upcoming class reminder + low balance alert)

**Solution:** Orchestrator enforces 2/day cap

```typescript
// Check how many notifications sent today
const notificationsToday = await getNotificationCountToday(userId);

if (notificationsToday >= 2) {
  console.log('User already received 2 notifications today, skipping');
  return { action: 'skip', reason: 'Daily limit reached' };
}

// If 1 notification sent, only send if priority is HIGH
if (notificationsToday === 1) {
  if (decision.priority !== 'high') {
    console.log('User already received 1 notification, only sending HIGH priority');
    return { action: 'skip', reason: 'Daily limit approaching, LOW priority' };
  }
}
```

---

### Timezone Handling

**Problem:** User in India (IST +5:30) receives notification at 3 AM local time

**Solution:** Store user timezone, calculate local hour

```typescript
// Get user's timezone from preferences (default to UTC if not set)
const userTimezone = await getUserTimezone(userId);

// Calculate user's local hour
const userLocalHour = getUserLocalHour(new Date(), userTimezone);

// Check quiet hours (10 PM - 8 AM)
if (userLocalHour >= 22 || userLocalHour < 8) {
  return { action: 'skip', reason: 'User in quiet hours' };
}
```

**Timezone Detection:**
- On app first launch, detect timezone from device: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Save to `user_preferences.timezone`
- Allow manual override in settings

---

### Notification Bundling

**Problem:** User has 3 classes scheduled today at 4 PM, 5 PM, 6 PM. Should we send 3 notifications or 1?

**Solution:** Bundle notifications within 1-hour window

```typescript
// In EngageAgent, group scheduled classes by time window
const upcomingClasses = classes
  .map(c => ({ class: c, time: getNextScheduledTime(c.schedule) }))
  .filter(c => getMinutesUntil(c.time) >= 55 && getMinutesUntil(c.time) <= 65);

if (upcomingClasses.length > 1) {
  // Send bundled notification
  return {
    action: 'send_notification',
    message: {
      title: `${upcomingClasses.length} classes today`,
      body: `You have ${upcomingClasses.map(c => c.class.name).join(', ')} starting soon.`
    },
    deepLink: 'recur://home',
    priority: 'high'
  };
} else if (upcomingClasses.length === 1) {
  // Send single notification
  return {
    action: 'send_notification',
    message: {
      title: `${upcomingClasses[0].class.name} in 1 hour`,
      body: `Your ${upcomingClasses[0].class.name} class starts at ${formatTime(upcomingClasses[0].time)}.`
    },
    deepLink: `recur://class/${upcomingClasses[0].class.id}`,
    priority: 'high'
  };
}
```

---

### Permission Denial Handling

**Problem:** User denies push notification permissions

**Solution:** Fall back to in-app prompts

```typescript
// In App.tsx
const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

useEffect(() => {
  checkNotificationPermission();
}, []);

async function checkNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  setHasNotificationPermission(status === 'granted');
}

// If no permission, show in-app banner
if (!hasNotificationPermission && userReached_1_1_5) {
  return (
    <View style={styles.permissionBanner}>
      <Text>Enable notifications to never miss a class!</Text>
      <Button onPress={requestPermissionAgain}>Enable</Button>
    </View>
  );
}
```

**Agent Behavior:**
- Agents still evaluate users and log decisions
- Orchestrator skips users without push tokens
- Users see agent messages as in-app banners on next app open

---

### Data Privacy & GDPR Compliance

**Problem:** User data tracking must comply with privacy regulations

**Solution:**

1. **Consent on First Launch**
   - Show privacy policy and terms
   - Explain what data is tracked
   - Get explicit consent before tracking

2. **Data Retention**
   - Keep activity logs for 90 days max
   - Auto-delete old activity_log entries
   - Keep aggregated metrics (no PII)

3. **User Data Export**
   - Provide "Download my data" feature
   - Export all activity logs, notifications, decisions

4. **Right to be Forgotten**
   - "Delete my account" deletes:
     - All activity logs
     - All notifications
     - All agent decisions
     - All push tokens
     - User preferences
   - CASCADE deletes handle this automatically

```sql
-- Auto-delete old activity logs (run daily)
DELETE FROM user_activity_log
WHERE created_at < NOW() - INTERVAL '90 days';

-- Auto-delete old agent decisions (run daily)
DELETE FROM agent_decisions
WHERE evaluated_at < NOW() - INTERVAL '90 days';
```

---

## Success Criteria

### Launch Criteria (Phase 1-4)

- ✅ All 6 agents implemented and tested
- ✅ Orchestrator running hourly without errors
- ✅ Notification delivery rate > 95%
- ✅ Notification open rate > 50%
- ✅ No spam complaints from users
- ✅ Activity tracking working for all key events
- ✅ Database RLS policies secure

### 30-Day Success Metrics

- 70%+ of new users reach 1-1-5 within 14 days (baseline: ~30%)
- 40%+ of "Never Tried" users convert to active (baseline: ~10%)
- 50%+ reduction in missed scheduled classes
- 30%+ increase in payment tracking adoption
- 60%+ notification open rate
- 25%+ action rate (user completes intended action)
- < 5% notification opt-out rate

### 90-Day Success Metrics

- D30 retention increases by 20%+
- Weekly active users increases by 30%+
- Average classes per user increases by 25%+
- User satisfaction score > 4.5/5
- Agent system requires < 2 hours/week maintenance
- System handles 10k+ users without scaling issues

---

## Future Enhancements (Post-Launch)

### Phase 6: Advanced Personalization
- ML model to predict optimal notification timing per user
- Dynamic message generation based on user's engagement pattern
- A/B testing framework for continuous optimization

### Phase 7: In-App Agent Interface
- In-app "Assistant" that shows agent suggestions
- "Why am I seeing this?" explanation for each notification
- User feedback: "This was helpful" / "Not relevant"

### Phase 8: Multi-Agent Conversations
- Sequential campaigns (e.g., 3-message onboarding sequence)
- Conditional branching based on user actions
- Smart retry logic for failed actions

### Phase 9: Predictive Agents
- Churn prediction agent (intervene before user churns)
- Upsell agent (identify candidates for premium features)
- Referral agent (ask satisfied users to invite friends)

---

## Appendix

### Notification Copy Guidelines

**Tone:**
- Friendly and supportive, never pushy
- Focus on value to user (stay organized, save time)
- Use user's data to personalize (names, numbers, dates)
- Keep it short (title max 40 chars, body max 120 chars)

**Bad Examples:**
- ❌ "You haven't used Recur in a while!" (guilt-tripping)
- ❌ "Complete your profile now!" (demanding)
- ❌ "Don't miss out!" (FOMO manipulation)

**Good Examples:**
- ✅ "Mark today's attendance in 5 seconds" (value-focused)
- ✅ "Sarah has yoga in 1 hour" (helpful reminder with name)
- ✅ "You've tracked 25 classes! 🎉" (celebration)

### Testing Checklist

**Pre-Launch Testing:**
- [ ] Send test notification to iOS device
- [ ] Send test notification to Android device
- [ ] Test all 6 agents with real user data
- [ ] Test notification frequency cap (try sending 3 in one day)
- [ ] Test quiet hours (manually set time to 2 AM)
- [ ] Test all deep links navigate correctly
- [ ] Test notification opened tracking
- [ ] Test activity logging for all events
- [ ] Test metrics calculation accuracy
- [ ] Test cohort transitions

**Monitoring (First Week):**
- [ ] Check orchestrator runs every hour
- [ ] Monitor notification delivery rate (should be > 95%)
- [ ] Monitor notification open rate (should be > 50%)
- [ ] Check for error logs in Supabase
- [ ] Review user feedback in app store reviews
- [ ] Check for spam/abuse reports

---

**Document End**
