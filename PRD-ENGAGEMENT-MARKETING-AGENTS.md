---
title: Recur - Engagement Marketing Agents System (Simplified MVP)
version: 2.0.0
date: 2025-11-28
status: Planning
related_prds:
  - PRD-RECUR.md (Core product)
  - PRD-CLASS-PAUSE.md (Pause functionality)
---

# Recur Engagement Marketing Agents - Product Requirements Document (MVP)

## Executive Summary

A simplified, rule-based notification system that sends **gentle nudges** to help users get value from Recur. The system respects user attention by sending helpful reminders only for **active classes**, automatically excluding paused classes from all engagement logic.

### MVP Philosophy

- **Gentle nudges, not aggressive marketing** - Help users succeed, don't annoy them
- **Pause-aware by default** - Respect user's temporary breaks
- **One message per trigger** - No A/B testing complexity
- **Simple frequency rules** - Longer gaps between notifications
- **4 focused agents** - Each with one clear job

### Goals

- Drive new users to "1-1-5" activation (1 family member, 1 class, 5 attendance records) within 14 days
- Help users complete class setup (schedule and payment tracking)
- Remind users before and after scheduled classes
- Alert users to low prepaid balance (only for classes with payment tracking)

### Success Metrics

- 50%+ of new users reach 1-1-5 activation within 14 days
- 60%+ notification open rate
- 20%+ action rate (user takes intended action after notification)
- < 5% notification opt-out rate

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Class Pause State Integration](#class-pause-state-integration)
3. [User Behavior Tracking](#user-behavior-tracking)
4. [Marketing Agents](#marketing-agents)
5. [Agent Orchestration](#agent-orchestration)
6. [Database Schema](#database-schema)
7. [Implementation Plan](#implementation-plan)

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│  - Tracks key user actions (attendance, class creation)     │
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
│  │  - User activity logs (minimal tracking)             │  │
│  │  - Notification history                               │  │
│  │  - Agent decisions log                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Serverless)                          │  │
│  │  - Agent Orchestrator (runs every hour)              │  │
│  │  - 4 Marketing Agents (simplified logic)             │  │
│  │  - Notification Sender (via Expo Push API)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  Expo Push API   │
                    │  (FCM/APNs)      │
                    └──────────────────┘
```

### Key Principles

1. **Rule-Based, Not AI** - All logic is deterministic, no LLMs, clear decision trees
2. **User-Centric** - Every notification is personalized with user's data (names, class names, dates)
3. **Non-Intrusive** - Max 1 notification/day, quiet hours (10 PM - 8 AM), respects pause state
4. **Pause-Aware** - Agents only target active classes, automatically skip paused ones
5. **Measurable** - Every decision logged, every notification tracked

---

## Class Pause State Integration

### Universal Filter Rule (Applied to ALL Agents)

**CRITICAL:** Every agent query MUST filter classes by `status = 'active'` before any decision logic.

```typescript
// ✅ CORRECT - Filter by active status
const classes = await supabase
  .from('classes')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active'); // <-- REQUIRED FILTER

// ❌ WRONG - Missing status filter
const classes = await supabase
  .from('classes')
  .select('*')
  .eq('user_id', userId);
```

### Pause-Aware Behavior

#### What Happens When Classes Are Paused

| Scenario | Agent Behavior |
|----------|---------------|
| User pauses all classes | All agents skip (no notifications sent) |
| User has mix of active + paused | Agents only consider active classes |
| User marks attendance on paused class | No notifications sent (class is paused) |
| User resumes paused class | Agents start evaluating that class again |
| User has 0 active classes, 3 paused | Onboarding Agent may send "add new class" nudge |

#### Agent-Specific Pause Logic

**Agent 1: Onboarding Agent**
- Counts ALL classes (active + paused) for progress tracking
- But only sends "mark attendance" nudges for active classes
- If user has only paused classes, treats as "no classes" for nudging

**Agent 2: Never Tried Agent**
- No change (user has no classes yet, pause state doesn't apply)

**Agent 3: Gather More Info Agent**
- Only evaluates active classes created in last 30 days
- Paused classes are excluded from "add schedule" and "record payment" nudges

**Agent 4: Engage Agent**
- Only checks scheduled times for active classes
- Paused classes never trigger attendance reminders
- Weekly summary includes only active class attendance

**Agent 5: Alert Agent**
- Only sends pre-class reminders for active scheduled classes
- Only calculates prepaid balance for active classes with payment records
- Paused classes don't trigger any alerts (balance or pre-class reminders)

### Decision Tree: Check Pause State First

```
1. Fetch classes for user
2. Filter: WHERE status = 'active'
3. If activeClasses.length === 0:
     → Skip all engagement logic (user has no active classes)
4. Else:
     → Proceed with agent-specific decision logic
```

---

## User Behavior Tracking

### What We Track (Minimal for MVP)

#### Core Events Only

| Event | When | Data Captured |
|-------|------|---------------|
| `family_member_added` | New family member created | timestamp, member_id |
| `class_added` | New class created | timestamp, class_id, has_schedule |
| `class_paused` | Class paused | timestamp, class_id |
| `class_resumed` | Class resumed | timestamp, class_id |
| `attendance_marked` | Attendance recorded | timestamp, class_id, class_date |
| `payment_recorded` | Payment added | timestamp, payment_id, class_id |
| `notification_opened` | User taps notification | timestamp, notification_id |

### How We Track

**Mobile App Implementation:**

```typescript
// shared/utils/analytics.ts

import { supabase } from '../api/supabase';

export async function trackEvent(eventType: string, eventData: Record<string, any> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      event_type: eventType,
      event_data: {
        ...eventData,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Convenience functions
export const trackFamilyMemberAdded = (memberId: string) =>
  trackEvent('family_member_added', { member_id: memberId });

export const trackClassAdded = (classId: string, hasSchedule: boolean) =>
  trackEvent('class_added', { class_id: classId, has_schedule: hasSchedule });

export const trackClassPaused = (classId: string, reason?: string) =>
  trackEvent('class_paused', { class_id: classId, paused_reason: reason });

export const trackClassResumed = (classId: string) =>
  trackEvent('class_resumed', { class_id: classId });

export const trackAttendanceMarked = (classId: string, memberId: string, classDate: string) =>
  trackEvent('attendance_marked', { class_id: classId, family_member_id: memberId, class_date: classDate });

export const trackNotificationOpened = (notificationId: string) =>
  trackEvent('notification_opened', { notification_id: notificationId });
```

---

## Marketing Agents

### Agent 1: Onboarding Agent

**Mission:** Guide new users to 1-1-5 activation (1 family member, 1 class, 5 attendance records)

**Target:** Users who installed within last 14 days AND haven't reached 1-1-5

**Execution Schedule:** Day 3 and Day 7 only

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  const user = await getUserProfile(userId);
  const daysSinceInstall = getDaysSince(user.created_at);

  // Only send on Days 3 and 7
  if (![3, 7].includes(daysSinceInstall)) {
    return { action: 'skip', reason: 'Not a notification day' };
  }

  // Check if already sent today
  const lastNotification = await getLastNotificationForAgent(userId, 'onboarding');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  if (daysSinceLastNotification < 1) {
    return { action: 'skip', reason: 'Already sent today' };
  }

  // Get progress
  const progress = await getOnboardingProgress(userId);

  // Count ALL classes for progress, but only ACTIVE for nudging
  const allClasses = await getClassesForUser(userId); // no status filter
  const activeClasses = allClasses.filter(c => c.status === 'active');

  // Day 3: Guide to first milestone
  if (daysSinceInstall === 3) {
    if (progress.family_members === 0) {
      return {
        action: 'send_notification',
        message: {
          title: "Your classes, organized",
          body: "Stop losing track of schedules and payments. In just 30 seconds, add your first family member and start tracking!"
        },
        deepLink: 'recur://add-family-member',
        priority: 'medium'
      };
    } else if (allClasses.length === 0) {
      return {
        action: 'send_notification',
        message: {
          title: "Almost there!",
          body: "Add your first class to start tracking attendance and spending."
        },
        deepLink: 'recur://add-class',
        priority: 'medium'
      };
    } else if (activeClasses.length > 0 && progress.attendance_count < 5) {
      return {
        action: 'send_notification',
        message: {
          title: "See your trends",
          body: "Mark a few sessions to unlock your attendance insights and cost per class."
        },
        deepLink: 'recur://home',
        priority: 'medium'
      };
    }
  }

  // Day 7: Final nudge or celebration
  if (daysSinceInstall === 7) {
    if (progress.family_members === 0) {
      return {
        action: 'send_notification',
        message: {
          title: "Give Recur a try",
          body: "Add your first family member and start tracking your recurring classes and payments!"
        },
        deepLink: 'recur://add-family-member',
        priority: 'low'
      };
    } else if (allClasses.length === 0) {
      return {
        action: 'send_notification',
        message: {
          title: "Ready when you are",
          body: "Add your first class to start tracking attendance and discover your cost per session."
        },
        deepLink: 'recur://add-class',
        priority: 'low'
      };
    } else if (activeClasses.length > 0 && progress.attendance_count < 5) {
      return {
        action: 'send_notification',
        message: {
          title: "Complete your setup",
          body: "Mark attendance for your classes to unlock spending insights and trends."
        },
        deepLink: 'recur://home',
        priority: 'low'
      };
    } else if (progress.attendance_count >= 5) {
      // Celebrate!
      return {
        action: 'send_notification',
        message: {
          title: "You're all set! 🎉",
          body: `${progress.attendance_count} sessions tracked in one week! Check out your cost per class.`
        },
        deepLink: 'recur://analytics',
        priority: 'low'
      };
    }
  }

  return { action: 'skip', reason: 'No action needed' };
}
```

**Notification Messages:**

| Timing | Trigger | Title | Body | Deep Link |
|--------|---------|-------|------|-----------|
| Day 3 | No family member | "Your classes, organized" | "Stop losing track of schedules and payments. In just 30 seconds, add your first family member and start tracking!" | `add-family-member` |
| Day 3 | No class | "Almost there!" | "Add your first class to start tracking attendance and spending." | `add-class` |
| Day 3 | Low attendance | "See your trends" | "Mark a few sessions to unlock your attendance insights and cost per class." | `home` |
| Day 7 | No family member | "Give Recur a try" | "Add your first family member and start tracking your recurring classes and payments!" | `add-family-member` |
| Day 7 | No class | "Ready when you are" | "Add your first class to start tracking attendance and discover your cost per session." | `add-class` |
| Day 7 | Low attendance | "Complete your setup" | "Mark attendance for your classes to unlock spending insights and trends." | `home` |
| Day 7 | Reached 1-1-5 | "You're all set! 🎉" | "{X} sessions tracked in one week! Check out your cost per class." | `analytics` |

---

### Agent 2: Never Tried Agent

**Mission:** Convert users who installed but never engaged

**Target:** Users who installed 30+ days ago AND have 0 family members

**Execution Schedule:** Every 7 days at 11 AM

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  const user = await getUserProfile(userId);
  const daysSinceInstall = getDaysSince(user.created_at);

  // Only target users 30-60 days old
  if (daysSinceInstall < 30 || daysSinceInstall > 60) {
    return { action: 'skip', reason: 'Outside target window' };
  }

  const familyMemberCount = await getFamilyMemberCount(userId);

  if (familyMemberCount > 0) {
    return { action: 'skip', reason: 'User has family members' };
  }

  // Check notification frequency (max 1 per week)
  const lastNotification = await getLastNotificationForAgent(userId, 'never_tried');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  if (daysSinceLastNotification < 7) {
    return { action: 'skip', reason: 'Too soon since last notification' };
  }

  return {
    action: 'send_notification',
    message: {
      title: "Never lose track again",
      body: "Stop using spreadsheets. Track all your classes in one beautifully simple app."
    },
    deepLink: 'recur://add-family-member',
    priority: 'low'
  };
}
```

**Notification Message:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| 30-60 days inactive | "Never lose track again" | "Stop using spreadsheets. Track all your classes in one beautifully simple app." | `add-family-member` |

---

### Agent 3: Gather More Info Agent

**Mission:** Help users complete class setup (schedule and payment tracking)

**Target:** Users with recent classes (< 30 days old) missing schedule OR payment records

**Execution Schedule:** Every 10 days at 12 PM

**Decision Logic:**

```typescript
async function evaluateUser(userId: string): Promise<AgentDecision> {
  // Fetch ONLY ACTIVE classes
  const classes = await supabase
    .from('classes')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active'); // PAUSE-AWARE FILTER

  const incompleteClasses = [];

  for (const classItem of classes.data || []) {
    const daysSinceCreated = getDaysSince(classItem.created_at);

    // Only nudge for recent classes (< 30 days)
    if (daysSinceCreated > 30) continue;

    const hasSchedule = classItem.schedule && classItem.schedule.length > 0;
    const paymentCount = await getPaymentCount(classItem.id);

    if (!hasSchedule || paymentCount === 0) {
      incompleteClasses.push({
        class: classItem,
        missing: {
          schedule: !hasSchedule,
          payment: paymentCount === 0
        }
      });
    }
  }

  if (incompleteClasses.length === 0) {
    return { action: 'skip', reason: 'All active classes have complete setup' };
  }

  // Check notification frequency (max 1 per 10 days)
  const lastNotification = await getLastNotificationForAgent(userId, 'gather_more_info');
  const daysSinceLastNotification = lastNotification ? getDaysSince(lastNotification.sent_at) : 999;

  if (daysSinceLastNotification < 10) {
    return { action: 'skip', reason: 'Too soon since last notification' };
  }

  // Pick the first incomplete class
  const targetClass = incompleteClasses[0];

  // Prioritize: schedule > payment
  if (targetClass.missing.schedule) {
    return {
      action: 'send_notification',
      message: {
        title: `Never miss ${targetClass.class.name} again`,
        body: "Add a schedule and we'll remind you before each session."
      },
      deepLink: `recur://class/${targetClass.class.id}/edit`,
      priority: 'medium'
    };
  } else if (targetClass.missing.payment) {
    return {
      action: 'send_notification',
      message: {
        title: `Track ${targetClass.class.name} spending`,
        body: "Record your payment to see your actual cost per class. Takes 20 seconds."
      },
      deepLink: `recur://class/${targetClass.class.id}/record-payment`,
      priority: 'medium'
    };
  }

  return { action: 'skip', reason: 'No incomplete classes' };
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| Active class missing schedule | "Never miss {ClassName} again" | "Add a schedule and we'll remind you before each session." | `class/{id}/edit` |
| Active class missing payment | "Track {ClassName} spending" | "Record your payment to see your actual cost per class. Takes 20 seconds." | `class/{id}/record-payment` |

---

### Agent 4: Engage Agent

**Mission:** Keep active users engaged through gentle reminders

**Target:** Users with scheduled, active classes

**Execution Schedule:**
- **Post-class reminders:** 2 hours after scheduled class time (if attendance not marked)
- **Weekly summary:** Sunday at 6 PM

**Decision Logic:**

```typescript
async function evaluateUser(userId: string, evaluationTime: Date): Promise<AgentDecision> {
  // Fetch ONLY ACTIVE classes with schedules
  const classes = await supabase
    .from('classes')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active'); // PAUSE-AWARE FILTER

  const activeClassesWithSchedule = (classes.data || []).filter(
    c => c.schedule && c.schedule.length > 0
  );

  if (activeClassesWithSchedule.length === 0) {
    return { action: 'skip', reason: 'No active classes with schedules' };
  }

  // Check for post-class reminder (2 hours after scheduled time)
  for (const classItem of activeClassesWithSchedule) {
    const lastScheduledTime = getLastScheduledTime(classItem.schedule, evaluationTime);
    const hoursSinceClass = getHoursSince(lastScheduledTime);

    // Between 2-3 hours after class
    if (hoursSinceClass >= 2 && hoursSinceClass <= 3) {
      const attendanceMarked = await checkAttendanceMarked(classItem.id, lastScheduledTime);

      if (!attendanceMarked) {
        const alreadyNotified = await checkRecentNotification(userId, 'post_class_reminder', classItem.id, 6);

        if (!alreadyNotified) {
          return {
            action: 'send_notification',
            message: {
              title: `Did you attend ${classItem.name}?`,
              body: "Don't forget to mark your attendance for today's session!"
            },
            deepLink: `recur://class/${classItem.id}`,
            priority: 'medium'
          };
        }
      }
    }
  }

  // Check for weekly summary (Sunday 6 PM)
  const dayOfWeek = evaluationTime.getDay();
  const hourOfDay = evaluationTime.getHours();

  if (dayOfWeek === 0 && hourOfDay === 18) {
    const lastSummary = await getLastNotificationForAgent(userId, 'weekly_summary');
    const daysSinceSummary = lastSummary ? getDaysSince(lastSummary.sent_at) : 999;

    if (daysSinceSummary >= 7) {
      const weeklyStats = await getWeeklyAttendanceStats(userId, activeClassesWithSchedule);

      if (weeklyStats.classesThisWeek > 0) {
        return {
          action: 'send_notification',
          message: {
            title: "Your week in classes",
            body: `You attended ${weeklyStats.classesThisWeek} classes this week. Total this month: ${weeklyStats.classesThisMonth}.`
          },
          deepLink: 'recur://analytics',
          priority: 'low'
        };
      }
    }
  }

  return { action: 'skip', reason: 'No engagement actions needed' };
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| 2hr after scheduled class (not marked) | "Did you attend {ClassName}?" | "Don't forget to mark your attendance for today's session!" | `class/{id}` |
| Sunday 6 PM (weekly summary) | "Your week in classes" | "You attended {X} classes this week. Total this month: {Y}." | `analytics` |

---

### Agent 5: Alert Agent

**Mission:** Alert users about low prepaid balance and upcoming scheduled classes

**Target:** All users with active classes that have payment records AND/OR schedules

**Execution Schedule:** Runs hourly to check for upcoming classes; low balance checked daily at 9 AM

**Decision Logic:**

```typescript
async function evaluateUser(userId: string, evaluationTime: Date): Promise<AgentDecision> {
  // Fetch ONLY ACTIVE classes
  const classes = await supabase
    .from('classes')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active'); // PAUSE-AWARE FILTER

  if (!classes.data || classes.data.length === 0) {
    return { action: 'skip', reason: 'No active classes' };
  }

  const alerts: AgentDecision[] = [];

  // PRIORITY 1: Pre-class reminders (2 hours before scheduled class)
  // Handles DnD rules: Classes before 10 AM get alert at 9 PM prior day
  for (const classItem of classes.data) {
    const hasSchedule = classItem.schedule && classItem.schedule.length > 0;
    if (!hasSchedule) continue;

    const nextScheduledTime = getNextScheduledTime(classItem.schedule, evaluationTime);
    if (!nextScheduledTime) continue;

    const hoursUntilClass = getHoursUntil(evaluationTime, nextScheduledTime);
    const classHour = nextScheduledTime.getHours();

    // Calculate ideal alert time based on DnD rules
    let shouldSendAlert = false;

    if (classHour < 10) {
      // Classes before 10 AM: Send alert at 9 PM the prior day
      const currentHour = evaluationTime.getHours();
      const isPriorDay = evaluationTime.getDate() !== nextScheduledTime.getDate();

      if (isPriorDay && currentHour === 21) {
        // It's 9 PM the day before an early class
        shouldSendAlert = true;
      }
    } else {
      // Classes at 10 AM or later: Send alert 2 hours before
      if (hoursUntilClass >= 2 && hoursUntilClass < 3) {
        shouldSendAlert = true;
      }
    }

    if (shouldSendAlert) {
      const alreadyNotified = await checkRecentNotification(
        userId,
        'pre_class_alert',
        classItem.id,
        24 // Don't send if already notified in last 24 hours
      );

      if (!alreadyNotified) {
        const timeDisplay = formatTime(nextScheduledTime); // e.g., "3:00 PM"

        alerts.push({
          action: 'send_notification',
          message: {
            title: `${classItem.name} ${classHour < 10 ? 'tomorrow' : 'today'}`,
            body: `Your class is at ${timeDisplay}. Don't forget to attend!`
          },
          deepLink: `recur://class/${classItem.id}`,
          priority: 'high',
          metadata: { class_id: classItem.id, scheduled_time: nextScheduledTime.toISOString() }
        });
      }
    }
  }

  // PRIORITY 2: Low balance alerts (only for classes with payment records)
  // Run daily at 9 AM
  const currentHour = evaluationTime.getHours();

  if (currentHour === 9) {
    for (const classItem of classes.data) {
      const paymentCount = await getPaymentCount(classItem.id);

      // Only alert if class has payment records (user is tracking payments)
      if (paymentCount === 0) continue;

      const balance = await getPrepaidBalance(classItem.id);

      // Low balance definition: < 3 classes remaining
      if (balance.remaining < 3 && balance.remaining >= 0) {
        const lastAlert = await getLastNotificationForAgent(
          userId,
          'low_balance_alert',
          classItem.id
        );

        // Send once when hitting threshold, don't repeat
        if (!lastAlert) {
          alerts.push({
            action: 'send_notification',
            message: {
              title: `Low balance: ${classItem.name}`,
              body: `Only ${balance.remaining} prepaid ${balance.remaining === 1 ? 'class' : 'classes'} left. Record your next payment?`
            },
            deepLink: `recur://class/${classItem.id}/record-payment`,
            priority: 'high',
            metadata: { class_id: classItem.id, balance_remaining: balance.remaining }
          });
        }
      }
    }
  }

  // Return first alert if any (pre-class has priority over low balance)
  if (alerts.length === 0) {
    return { action: 'skip', reason: 'No alerts needed' };
  }

  return alerts[0];
}
```

**Notification Messages:**

| Trigger | Title | Body | Deep Link |
|---------|-------|------|-----------|
| 2hr before class (or 9 PM prior day if before 10 AM) | "{ClassName} {today/tomorrow}" | "Your class is at {time}. Don't forget to attend!" | `class/{id}` |
| Active class with payments, balance < 3 | "Low balance: {ClassName}" | "Only {X} prepaid class(es) left. Record your next payment?" | `class/{id}/record-payment` |

**Low Balance Definition:** Less than 3 prepaid classes remaining

**DnD Rule for Pre-Class Alerts:**
- Classes scheduled at **10 AM or later** → Alert sent **2 hours before** (same day)
- Classes scheduled **before 10 AM** → Alert sent at **9 PM the prior day**
- This ensures no alerts are sent during quiet hours (10 PM - 8 AM)

---

## Agent Orchestration

### Orchestrator Logic

The **Agent Orchestrator** is a Supabase Edge Function that runs every hour and coordinates all marketing agents.

**Key Behaviors:**

1. **Frequency Cap:** Max 1 notification per user per day
2. **Quiet Hours:** No notifications between 10 PM - 8 AM (user local time)
3. **Priority System:** Agents evaluated in priority order, first match wins
4. **Pause-Aware:** All agents skip if user has no active classes

**Priority Order:**

1. **Alert Agent** (highest) - Low balance alerts
2. **Engage Agent** - Post-class reminders, weekly summary
3. **Gather More Info Agent** - Add schedule nudges
4. **Onboarding Agent** - New user guidance
5. **Never Tried Agent** (lowest) - Dormant user reactivation

**File:** `supabase/functions/agent-orchestrator/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    console.log(`[Orchestrator] Starting evaluation at ${evaluationTime.toISOString()}`);

    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    console.log(`[Orchestrator] Evaluating ${users.users.length} users`);

    let notificationsSent = 0;
    let usersProcessed = 0;

    // Process each user
    for (const user of users.users) {
      try {
        // Check if user has push token
        const { data: pushToken } = await supabase
          .from('user_push_tokens')
          .select('expo_push_token')
          .eq('user_id', user.id)
          .single();

        if (!pushToken?.expo_push_token) {
          continue;
        }

        // Check frequency cap (max 1 per day)
        const notificationsToday = await getNotificationCountToday(supabase, user.id);
        if (notificationsToday >= 1) {
          console.log(`[Orchestrator] User ${user.id} already received notification today`);
          continue;
        }

        // Check quiet hours (10 PM - 8 AM)
        const userTimezone = await getUserTimezone(supabase, user.id);
        const userLocalHour = getUserLocalHour(evaluationTime, userTimezone);

        if (userLocalHour >= 22 || userLocalHour < 8) {
          console.log(`[Orchestrator] User ${user.id} in quiet hours (${userLocalHour}:00)`);
          continue;
        }

        // Evaluate agents in priority order
        const agents = [
          { name: 'alert', priority: 1 },
          { name: 'engage', priority: 2 },
          { name: 'gather_more_info', priority: 3 },
          { name: 'onboarding', priority: 4 },
          { name: 'never_tried', priority: 5 },
        ];

        let notificationSent = false;

        for (const { name } of agents) {
          const decision = await evaluateAgent(supabase, name, user.id, evaluationTime);

          // Log decision
          await logAgentDecision(supabase, {
            user_id: user.id,
            agent_name: name,
            decision: decision.action,
            reason: decision.reason,
            priority: decision.priority,
          });

          // If agent wants to send notification, do it and stop
          if (decision.action === 'send_notification' && !notificationSent) {
            await sendNotification(supabase, {
              user_id: user.id,
              agent_name: name,
              title: decision.message!.title,
              body: decision.message!.body,
              deep_link: decision.deepLink,
              expo_push_token: pushToken.expo_push_token,
            });

            notificationsSent++;
            notificationSent = true;
            break; // Stop after first notification
          }
        }

        usersProcessed++;
      } catch (error) {
        console.error(`[Orchestrator] Error processing user ${user.id}:`, error);
      }
    }

    console.log(`[Orchestrator] Complete: ${usersProcessed} users processed, ${notificationsSent} notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: usersProcessed,
        notifications_sent: notificationsSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## Database Schema

### Tables Required

#### `user_activity_log` (Minimal Activity Tracking)

```sql
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_event_type ON user_activity_log(event_type);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `user_push_tokens` (Push Notification Tokens)

```sql
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_push_tokens_user_id ON user_push_tokens(user_id);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON user_push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### `notification_history` (Sent Notifications Log)

```sql
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  deep_link TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_agent_name ON notification_history(agent_name);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);

ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification history"
  ON notification_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

#### `agent_decision_log` (Agent Evaluation Decisions)

```sql
CREATE TABLE IF NOT EXISTS agent_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'send_notification' or 'skip'
  reason TEXT,
  priority TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_agent_decision_log_user_id ON agent_decision_log(user_id);
CREATE INDEX idx_agent_decision_log_agent_name ON agent_decision_log(agent_name);
CREATE INDEX idx_agent_decision_log_evaluated_at ON agent_decision_log(evaluated_at);

ALTER TABLE agent_decision_log ENABLE ROW LEVEL SECURITY;

-- Service role only (no user access needed)
CREATE POLICY "Service role can manage agent decisions"
  ON agent_decision_log FOR ALL
  USING (true);
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal:** Set up tracking and database infrastructure

1. Create database tables (activity log, push tokens, notification history, agent decision log)
2. Implement basic activity tracking in mobile app (family member added, class added, attendance marked)
3. Add push token registration on app login
4. Create simple Edge Function for sending test notification

**Deliverable:** Users can receive test push notifications

---

### Phase 2: Agent 1 - Onboarding (Week 2)

**Goal:** Get new users to 1-1-5 activation

1. Implement Onboarding Agent (Day 3 and Day 7 logic)
2. Create agent orchestrator skeleton (runs every hour)
3. Add frequency cap and quiet hours logic
4. Test with real users in onboarding flow

**Deliverable:** New users receive Day 3 and Day 7 onboarding nudges

---

### Phase 3: Agent 4 - Engage (Week 3)

**Goal:** Remind active users to mark attendance

1. Implement Engage Agent (post-class reminder, weekly summary)
2. Add schedule parsing logic (calculate last scheduled time)
3. Test with users who have scheduled classes
4. Monitor notification open rates

**Deliverable:** Users get reminders 2 hours after scheduled classes

---

### Phase 4: Agent 5 - Alert (Week 4)

**Goal:** Prevent users from running out of prepaid classes

1. Implement Alert Agent (low balance only)
2. Add prepaid balance calculation helper
3. Test with users who have low prepaid balance
4. Refine alert threshold based on feedback

**Deliverable:** Users get low balance alerts (< 3 classes remaining)

---

### Phase 5: Agents 2 & 3 (Week 5)

**Goal:** Complete MVP agent suite

1. Implement Never Tried Agent (dormant user reactivation)
2. Implement Gather More Info Agent (add schedule + payment tracking nudges)
3. Add pre-class reminders with DnD rule handling to Alert Agent
4. Test full agent priority system
5. Add observability dashboard (notification stats)

**Deliverable:** All 5 agents running in production with monitoring

---

### Phase 6: Optimization (Week 6+)

**Goal:** Improve effectiveness based on data

1. Analyze notification open rates by agent
2. Refine message copy based on performance
3. Adjust frequency and timing based on user feedback
4. Add opt-out preferences (per-agent notification settings)

**Deliverable:** Data-driven improvements, user notification preferences

---

## Success Criteria

### MVP Success Metrics (After 30 Days)

- **Activation Rate:** 50%+ of new users reach 1-1-5 within 14 days
- **Notification Open Rate:** 60%+ overall
- **Action Rate:** 20%+ (user takes intended action after notification)
- **Opt-Out Rate:** < 5% (users disabling notifications)
- **User Satisfaction:** Net Promoter Score (NPS) > 40

### Technical Success Metrics

- **Agent Orchestrator Uptime:** 99%+ (runs every hour without failure)
- **Notification Delivery Rate:** 95%+ (successfully sent via Expo Push API)
- **Agent Decision Latency:** < 1 second per user evaluation
- **Database Query Performance:** < 500ms for all agent queries

---

## Summary

This simplified MVP focuses on **5 focused agents** that respect user attention and automatically exclude paused classes:

1. **Onboarding Agent** - Guide new users to first value (Day 3 & 7)
2. **Never Tried Agent** - Reactivate dormant installers (every 7 days)
3. **Gather More Info Agent** - Nudge to add schedule + payment tracking (every 10 days)
4. **Engage Agent** - Post-class reminders + weekly summary
5. **Alert Agent** - Pre-class reminders (2hr before, DnD-aware) + low balance warnings (< 3 classes)

**Key Features:**
- **Pre-class reminders** with smart DnD handling (9 PM prior day for early classes)
- **Low balance alerts** only for classes with payment tracking
- **Payment tracking nudges** to help users see cost per class
- **Pause-aware by default** - universal status filter on all agents
- **Max 1 notification/day** - respect user attention
- **No A/B testing** - single message per trigger

**DnD Rule Implementation:**
- Classes before 10 AM → Alert at 9 PM prior day
- Classes at 10 AM+ → Alert 2 hours before
- No notifications 10 PM - 8 AM

**Implementation Timeline:** 6 weeks from foundation to full MVP with monitoring.
