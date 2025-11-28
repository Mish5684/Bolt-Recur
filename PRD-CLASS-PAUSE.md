---
title: Recur - Class Pause Feature
version: 1.0.0
date: 2025-01-28
status: Planning
related_prds:
  - PRD-RECUR.md (Core product)
  - PRD-ENGAGEMENT-MARKETING-AGENTS.md (Notification system)
---

# PRD: Class Pause Feature

## Executive Summary

Add the ability for users to **pause** a class temporarily without deleting attendance history, payment records, or class configuration. Paused classes stop sending engagement notifications but preserve all historical data for future reference. This solves the problem of users receiving irrelevant notifications during vacations, injuries, seasonal breaks, or trial period endings.

**Core Principle:** Pause is a **soft state change**, not a delete operation. Everything remains queryable and viewable, but engagement behavior changes.

---

## Problem Statement

**Current Pain Points:**
1. User takes a 3-week vacation → Gets 6+ "mark attendance" notifications
2. Kid injures ankle, pauses soccer for 2 months → Alert Agent sends "low balance" warnings
3. Trial piano lessons ended, unsure if continuing → Only option is permanent delete
4. Seasonal swimming class (summer only) → Winter notifications are annoying

**User Feedback Themes:**
- "I don't want to delete because I want to see my history"
- "Stop reminding me about yoga while I'm on vacation"
- "I'm taking a break but might come back"

---

## Product Goals

1. **Reduce notification fatigue** by 25-30% (fewer irrelevant notifications)
2. **Increase data retention** - users pause instead of delete (retain 40%+ more historical data)
3. **Improve user satisfaction** - give users control over engagement without data loss
4. **Maintain engagement accuracy** - agents only target truly active classes

---

## User Stories

### Core Functionality
- As a user, I want to **pause a class** so that I stop receiving notifications about it temporarily
- As a user, I want to **see paused classes separately** so I remember which ones are on hold
- As a user, I want to **resume a paused class** when I'm ready to continue
- As a user, I want to **view all historical data** (attendance, payments) even when a class is paused
- As a user, I want to **optionally note why I paused** (vacation, injury, etc.) for my own reference

### Edge Cases
- As a user, I want to **mark attendance on a paused class** (rare: maybe I attended a makeup session)
- As a user, I want to **record a payment on a paused class** (e.g., paid for next term before resuming)
- As a user, I want to **edit class details** while paused (update instructor, schedule for when I resume)
- As a user, I want to **delete a paused class** if I decide not to return

---

## Functional Requirements

### 1. Database Schema Changes

**Table:** `classes`

**New Columns:**
```sql
-- Status: either 'active' or 'paused' (default: 'active')
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused'))

-- Timestamp when class was paused (null if never paused or currently active)
paused_at TIMESTAMPTZ

-- Optional user note about why paused (max 200 chars, for user context only)
paused_reason TEXT
```

**Migration Behavior:**
- All existing classes default to `status = 'active'`
- `paused_at` and `paused_reason` are NULL for existing classes
- No changes to RLS policies (status doesn't affect data access security)

**Index Requirements:**
```sql
-- For efficient filtering in agent queries and home screen
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_user_status ON classes(user_id, status);
```

---

### 2. UI Changes: Class Detail Screen

#### Button Layout (Side-by-Side)

**When Class Status = 'active':**
```
┌────────────────────────────────────────────┐
│  [Pause Class]      |  [Delete Class]      │
│  (Gray outline)     |  (Red outline)       │
└────────────────────────────────────────────┘
```

**When Class Status = 'paused':**
```
┌────────────────────────────────────────────┐
│  [Resume Class]     |  [Delete Class]      │
│  (Green outline)    |  (Red outline)       │
└────────────────────────────────────────────┘
```

#### Pause Class Flow

**Step 1: User taps "Pause Class"**
- Alert modal appears with title: "Pause {ClassName}?"
- Body text: "You'll stop receiving reminders. All your attendance and payment history stays safe."
- Optional: Quick reason buttons (not required):
  - [ ] Vacation
  - [ ] Injury/Health
  - [ ] Seasonal Break
  - [ ] Taking a Break
  - [ ] Other
- Two buttons:
  - "Cancel" (default, dismisses modal)
  - "Pause Class" (primary action)

**Step 2: On confirmation**
- Update database:
  ```typescript
  {
    status: 'paused',
    paused_at: new Date().toISOString(),
    paused_reason: selectedReason || null // only if user selected
  }
  ```
- Show success toast: "Class paused. Resume anytime!"
- Reload class detail screen (button changes to "Resume")

#### Resume Class Flow

**Step 1: User taps "Resume Class"**
- Simple confirmation alert: "Resume {ClassName}?"
- Body text: "You'll start receiving reminders again."
- Two buttons:
  - "Cancel"
  - "Resume" (primary action, green)

**Step 2: On confirmation**
- Update database:
  ```typescript
  {
    status: 'active',
    paused_at: null,
    paused_reason: null
  }
  ```
- Show success toast: "Welcome back to {ClassName}!"
- Reload class detail screen (button changes to "Pause")

#### Visual Indicators When Paused

**At top of Class Detail Screen:**
- Show status badge:
  ```
  [⏸️ Paused] - Since Dec 15, 2024
  ```
- If `paused_reason` exists:
  ```
  [⏸️ Paused - Vacation] - Since Dec 15, 2024
  ```
- Badge styling: Light gray background, dark gray text, small font

**No other changes to screen:**
- Attendance calendar still shows all historical dates (read-only)
- Payment history still visible
- Metrics (classes attended, balance) still calculated
- Edit class button still works
- Can still navigate to "Record Payment" screen

---

### 3. UI Changes: Home Screen (Class List)

#### Section Organization

**Active Classes Section** (default, always visible)
```
Active Classes (5)
┌──────────────────────────────────────┐
│ Yoga - Mon, Wed, Fri                 │
│ 45 classes attended                  │
└──────────────────────────────────────┘
[... more active classes ...]
```

**Paused Classes Section** (collapsible, only shows if any paused)
```
Paused Classes (2) [▼]
┌──────────────────────────────────────┐
│ [⏸️] Swimming - Paused 12 days ago   │
│ Reason: Seasonal Break               │
│                    [Resume] button    │
└──────────────────────────────────────┘
[... more paused classes ...]
```

**Visual Differences:**
- Paused class cards: 70% opacity, gray-ish tint
- Show pause icon (⏸️) and pause duration
- Show pause reason if available
- Prominent "Resume" button (small, green outline)
- Still tappable → navigates to Class Detail Screen

**Empty States:**
- If no paused classes, section doesn't appear at all
- If no active classes but has paused: "No active classes. Resume one below?"

---

### 4. Functional Behavior: What Can You Do With Paused Classes?

#### Allowed Actions (All Still Work)

✅ **View Class Detail Screen** - Tap paused class card, see full detail page
✅ **View Attendance History** - Calendar shows all past dates (grayed out)
✅ **View Payment History** - All payments visible
✅ **View Metrics** - Attendance count, balance, cost per class calculated normally
✅ **Edit Class Details** - Change name, instructor, schedule, location
✅ **Mark Attendance** (with warning) - See below
✅ **Record Payment** (with warning) - See below
✅ **Delete Class** - Permanent delete still available
✅ **Resume Class** - Primary action, changes status back to active

#### Special Cases: Mark Attendance on Paused Class

**Scenario:** User paused yoga for vacation. Came back one day for a special workshop. Wants to mark attendance.

**UX Flow:**
1. User navigates to paused class detail screen
2. User taps date on calendar or "Mark Today" button
3. Alert appears:
   ```
   This class is currently paused

   Mark attendance anyway?
   (This won't resume the class)

   [Cancel] [Mark Attendance]
   ```
4. If confirmed:
   - Attendance record created normally
   - Class remains paused (status doesn't change)
   - Success toast: "Attendance marked. Class still paused."

**Why allow this:** Makeup sessions, drop-ins, or sporadic attendance during pause period.

#### Special Cases: Record Payment on Paused Class

**Scenario:** User paused piano lessons for summer. Paid for fall term in advance before resuming.

**UX Flow:**
1. User navigates to paused class detail screen
2. User taps "Record Payment" (button still visible)
3. Payment form appears with info banner:
   ```
   ℹ️ This class is paused. Recording payment won't resume it.
   ```
4. User fills form and saves:
   - Payment record created normally
   - Class remains paused
   - Success toast: "Payment recorded. Resume class when ready."

**Why allow this:** Pre-payments, settling old dues, or advance booking.

---

### 5. Engagement Agent Changes

#### Core Filter Rule (Applied to ALL Agents)

**Before any agent logic:**
```typescript
// Fetch only ACTIVE classes for notification decisions
const classes = await supabase
  .from('classes')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active'); // <-- NEW FILTER

// Continue with agent logic on activeClasses only
```

**Result:** Paused classes are invisible to all engagement agents.

#### Agent-Specific Changes

**1. Onboarding Agent (1-1-5 activation)**
```typescript
// Count both active AND paused for onboarding progress
// (user DID create the class, so it counts toward learning the app)
const allClasses = await getClassesForUser(userId); // no status filter
const progress = {
  familyMembers: familyMembers.length,
  classes: allClasses.length, // includes paused
  attendanceRecords: attendance.length
};

// But only send "mark attendance" reminders for ACTIVE classes
const activeClasses = allClasses.filter(c => c.status === 'active');
if (activeClasses.length === 0) {
  return { action: 'skip', reason: 'No active classes to track' };
}
```

**2. Never Tried Agent (dormant users)**
- No change (targets users who never set up, status doesn't exist yet)

**3. Gather More Info Agent (add schedule/payment)**
```typescript
const classes = await getClassesForUser(userId);
const activeClasses = classes.filter(c => c.status === 'active'); // NEW

// Only nudge to add schedule/payment for ACTIVE classes
const incompleteClasses = activeClasses.filter(c =>
  !c.schedule || paymentCount === 0
);
```

**4. Engage Agent (weekly reminders)**
```typescript
const classes = await getClassesForUser(userId);
const activeClasses = classes.filter(c => c.status === 'active'); // NEW

// Only send "mark this week's attendance" for active classes
// If user has ONLY paused classes, skip notification entirely
if (activeClasses.length === 0) {
  return { action: 'skip', reason: 'All classes paused' };
}
```

**5. Alert Agent (low balance, missed schedule)**
```typescript
const classes = await getClassesForUser(userId);
const activeClasses = classes.filter(c => c.status === 'active'); // NEW

// Only alert about low balance or missed classes for active ones
// Paused classes: no payment warnings, no attendance reminders
```

---

### 6. Analytics Impact

#### Home Screen Metrics

**Default Behavior:**
- "Classes this week" → Count only active classes
- "Total classes attended" → Count attendance for active classes only
- "Monthly spending" → Sum payments for active classes only

**Optional Toggle (Future Enhancement):**
- "Include paused classes in stats" checkbox
- When enabled, show combined metrics

#### Class Detail Screen Metrics

**Always show full historical data:**
- "45 classes attended" → Count ALL attendance records (even if class is paused)
- "12 classes remaining" → Calculate based on ALL payments and attendance
- "Cost per class" → Calculate from full history

**Rationale:** When viewing a specific class detail, user wants complete historical picture regardless of current status.

---

### 7. Edge Cases & Complexities

#### Edge Case 1: User Pauses All Their Classes

**Scenario:** User has 3 classes, pauses all 3 (going on 2-month sabbatical).

**Expected Behavior:**
- Home screen shows: "All classes paused" empty state
- No agent notifications sent (all agents skip)
- User can still:
  - View paused classes
  - Resume any class
  - Add new classes (which are active by default)
  - View historical data

**Agent Behavior:**
- After 30 days of no active classes: Optional "dormant user" recovery message (low priority)
- Message: "Miss tracking your classes? Resume when you're ready!" (non-intrusive)

#### Edge Case 2: Pause During Onboarding

**Scenario:** New user creates 1 class, marks 2 attendance, then pauses it.

**Expected Behavior:**
- Onboarding progress: Still shows "1 class created" ✓
- Attendance milestone: "2/5 attendance records" ✓
- But stops sending "mark attendance" reminders
- Onboarding Agent: Skips user (no active classes to nudge about)

**Rationale:** User learned the feature (counts toward onboarding) but doesn't want reminders.

#### Edge Case 3: Pause, Delete, Then Recreate

**Scenario:** User pauses "Yoga", later deletes it, then creates new "Yoga" class.

**Expected Behavior:**
- Old class: Deleted (all data CASCADE deleted per current schema)
- New class: Fresh entity, status = 'active', no history
- No connection between old and new class

**Rationale:** Delete is destructive. Pause-then-delete has same outcome as direct delete.

#### Edge Case 4: Scheduled Class Day While Paused

**Scenario:** User pauses "Piano" on Monday. Piano is scheduled for Wednesdays. Wednesday arrives.

**Expected Behavior:**
- No "mark attendance" notification sent (class is paused)
- Calendar on Class Detail screen shows Wednesday as a scheduled day (grayed out)
- No agent reminders

**Rationale:** Pause means "I know the class exists, but I'm not attending. Don't remind me."

#### Edge Case 5: Low Prepaid Balance While Paused

**Scenario:** User pauses "Swimming" with 2 classes remaining. Balance goes negative (attended 2 while active, then paused).

**Expected Behavior:**
- No "low balance" alert sent (class is paused)
- Balance still visible in Class Detail screen (shows -2 or 0)
- When user resumes: Alert Agent evaluates balance and sends reminder if needed

**Rationale:** User paused the class, so payment alerts are irrelevant during pause.

#### Edge Case 6: Resume During Scheduled Day

**Scenario:** User resumes "Yoga" on Wednesday. Yoga is scheduled for Mon/Wed/Fri. It's currently Wednesday 10 AM.

**Expected Behavior:**
- Class status changes to 'active' immediately
- No immediate notification sent (just resumed)
- Next scheduled day (Friday): Engage Agent may send reminder
- User can manually mark today's attendance if they attended

**Rationale:** Resume is user-initiated, so they're aware. Don't over-notify.

---

### 8. Future Enhancements (Not in V1)

#### Auto-Resume on Date
- Add `resume_on` date field
- User sets: "Resume on July 1st"
- Cron job checks daily, auto-resumes classes that hit target date
- Send notification: "Welcome back to {ClassName}!"

#### Pause Suggestion (Proactive)
- If user hasn't marked attendance for 21+ days on active class
- Show gentle prompt: "Haven't seen you at {ClassName} lately. Want to pause it?"
- Non-intrusive, in-app banner (not push notification)

#### Seasonal Class Template
- "This is a seasonal class" checkbox on class creation
- Suggests pause/resume dates based on season
- Auto-tag: paused_reason = "Seasonal"

---


## Implementation Phases

### Phase 1: Core Functionality (MVP)
- Database migration (add status, paused_at, paused_reason columns)
- Class Detail screen: Add Pause/Resume buttons
- Home screen: Add "Paused Classes" section
- Agent queries: Filter by status = 'active'

### Phase 2: Polish & Edge Cases
- Pause/Resume confirmation modals with reasons
- Visual indicators (pause badge, opacity)
- Mark attendance on paused class (with warning)
- Record payment on paused class (with info banner)

### Phase 3: Analytics Integration
- Update agent orchestration logs
- Track pause/resume events
- Measure notification reduction
- A/B test pause reason prompts

---

## Technical Implementation Notes

### State Management (Zustand)
```typescript
// shared/stores/recur.ts

pauseClass: async (classId: string, reason?: string) => {
  const { error } = await supabase
    .from('classes')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
      paused_reason: reason || null
    })
    .eq('id', classId);

  if (!error) {
    set((state) => ({
      classes: state.classes.map(c =>
        c.id === classId
          ? { ...c, status: 'paused', paused_at: new Date().toISOString(), paused_reason: reason }
          : c
      )
    }));
  }
  return !error;
},

resumeClass: async (classId: string) => {
  const { error } = await supabase
    .from('classes')
    .update({
      status: 'active',
      paused_at: null,
      paused_reason: null
    })
    .eq('id', classId);

  if (!error) {
    set((state) => ({
      classes: state.classes.map(c =>
        c.id === classId
          ? { ...c, status: 'active', paused_at: null, paused_reason: null }
          : c
      )
    }));
  }
  return !error;
}
```

### Activity Tracking
```typescript
// Track pause/resume events for analytics
await trackActivity({
  event_type: 'class_paused',
  event_data: {
    class_id: classId,
    class_name: className,
    paused_reason: reason,
    days_since_created: getDaysSince(classCreatedAt)
  }
});

await trackActivity({
  event_type: 'class_resumed',
  event_data: {
    class_id: classId,
    class_name: className,
    days_paused: getDaysSince(pausedAt)
  }
});
```

---

## Open Questions for User

1. **Pause reason prompt:** Required or optional? (Recommendation: Optional, with quick-select chips)
2. **Home screen default:** Should paused classes section be expanded or collapsed by default? (Recommendation: Collapsed if > 3 paused classes)
3. **Resume date picker:** Include in V1 or defer to future? (Recommendation: Defer, adds complexity)

---

## Summary

The Class Pause feature gives users fine-grained control over their engagement preferences without sacrificing data integrity. By adding a simple status field and respecting it across all agent queries, we solve the notification fatigue problem while maintaining full historical visibility.

**Key Benefits:**
- **User Empowerment:** "I control when to engage, not the app"
- **Data Preservation:** No more reluctant deletions
- **Agent Accuracy:** Only notify about truly active classes
- **Flexible Lifecycle:** Pause → Resume → Pause → Delete (any path works)

**Implementation Priority: HIGH** - Solves critical UX pain point, low technical complexity, high user satisfaction impact.
