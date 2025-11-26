# Attendance Record Page - Product Requirements Document

## Overview
This document describes the redesigned Class Detail page with a focus on smart attendance tracking that adapts to the user's class schedule and provides intelligent reminders.

---

## User Jobs To Be Done

1. **Mark today's attendance quickly** (80% of interactions)
2. **Check attendance stats at a glance** (remaining classes, this month, etc.)
3. **Review attendance patterns over time**
4. **Find and fix attendance marking mistakes**
5. **Understand value per class** (money spent / classes attended)
6. **Be reminded of missed classes** (when schedule exists)

---

## Data Model

### Existing Tables (Reference)

```typescript
interface Class {
  id: string;
  name: string;
  type?: string;
  instructor?: string;
  schedule?: ScheduleItem[];  // Array of scheduled days/times
  location_name?: string;
  address?: string;
  // ... location fields
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ScheduleItem {
  day: string;    // "Monday", "Tuesday", etc.
  time: string;   // "4:00 PM"
}

interface ClassAttendance {
  id: string;
  family_member_id: string;
  class_id: string;
  class_date: string;  // ISO date string
  created_at: string;
  user_id: string;
}

interface Payment {
  id: string;
  family_member_id: string;
  class_id: string;
  classes_paid: number;
  amount: number;
  currency: string;
  payment_date: string;
  created_at: string;
  user_id: string;
}
```

---

## Page Layout & Components

### Header Section
```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│                                         │
│  Piano Lessons                    ✏️    │
│  👨‍🏫 Sarah Chen                          │
│  📅 Mon & Thu 4:00 PM                   │
│  📍 Music Academy, Downtown             │
│                                         │
└─────────────────────────────────────────┘
```

**Contents:**
- Back navigation
- Class name (editable)
- Instructor name
- Schedule display (from `schedule` array)
- Location display

---

### Smart "Mark Attendance" Button

**Primary Action Component** - Adapts based on schedule and attendance state

This button uses simplified logic focused on TODAY with contextual information about next class.

#### State 1: Mark Today - Scheduled Day (Active)
```
┌─────────────────────────────────┐
│   ✓ MARK TODAY'S ATTENDANCE     │
│      (Thu, Dec 12, 2024)        │
│      4:00 PM                    │
└─────────────────────────────────┘
```
- **When:** Schedule exists + Today is a scheduled day + Not marked yet
- **Color:** Blue/Primary
- **Action:** Mark attendance for today
- **Shows:** Current date + time from schedule

#### State 2: Today Marked - Scheduled Day (Success)
```
┌─────────────────────────────────┐
│   ✓ Today's attendance marked!  │
│      Next class: Mon, Dec 16    │
└─────────────────────────────────┘
```
- **When:** Schedule exists + Today is a scheduled day + Already marked
- **Color:** Green/Success (light background)
- **Action:** Disabled
- **Shows:** Success message + next scheduled class

#### State 3: Not Scheduled Today (Informational)
```
┌─────────────────────────────────┐
│      Next class: Mon, Dec 16    │
│             4:00 PM             │
└─────────────────────────────────┘
```
- **When:** Schedule exists + Today is NOT a scheduled day
- **Color:** Gray/Neutral (light background)
- **Action:** Disabled (informational only)
- **Shows:** Next scheduled class date & time

#### State 4: Mark Today - No Schedule (Active)
```
┌─────────────────────────────────┐
│   ✓ MARK TODAY'S ATTENDANCE     │
│      (Thu, Dec 12, 2024)        │
└─────────────────────────────────┘
```
- **When:** No schedule + Today not marked yet
- **Color:** Blue/Primary
- **Action:** Mark attendance for today
- **Shows:** Current date (no time)

#### State 5: Today Marked - No Schedule (Success)
```
┌─────────────────────────────────┐
│   ✓ Today's attendance marked!  │
│      (Thu, Dec 12, 2024)        │
└─────────────────────────────────┘
```
- **When:** No schedule + Today already marked
- **Color:** Green/Success (light background)
- **Action:** Disabled
- **Shows:** Success message + current date

---

### Button Logic - Simplified Decision Tree

```javascript
function getMarkAttendanceButtonState(classData, attendanceRecords) {
  const today = new Date();
  const schedule = classData.schedule; // [{day: "Monday", time: "4:00 PM"}, ...]
  const todayMarked = isAlreadyMarked(today, attendanceRecords);

  // BRANCH 1: Schedule exists
  if (schedule && schedule.length > 0) {
    const isTodayScheduled = isScheduledDay(today, schedule);

    // Case 1A: Today IS a scheduled day
    if (isTodayScheduled) {
      const scheduledTime = getScheduledTime(today, schedule);

      if (!todayMarked) {
        // State 1: Mark Today - Scheduled Day (Active)
        return {
          label: "MARK TODAY'S ATTENDANCE",
          subtitle: `${formatDate(today)}\n${scheduledTime}`,
          disabled: false,
          color: "primary",
          action: () => markAttendance(today)
        };
      } else {
        // State 2: Today Marked - Scheduled Day (Success)
        const nextClass = getNextScheduledClass(schedule, today);
        return {
          label: "Today's attendance marked!",
          subtitle: `Next class: ${formatDate(nextClass.date)}`,
          disabled: true,
          color: "success"
        };
      }
    }

    // Case 1B: Today is NOT a scheduled day
    else {
      // State 3: Not Scheduled Today (Informational)
      const nextClass = getNextScheduledClass(schedule, today);
      return {
        label: `Next class: ${formatDate(nextClass.date)}`,
        subtitle: nextClass.time,
        disabled: true,
        color: "neutral"
      };
    }
  }

  // BRANCH 2: No schedule
  else {
    if (!todayMarked) {
      // State 4: Mark Today - No Schedule (Active)
      return {
        label: "MARK TODAY'S ATTENDANCE",
        subtitle: formatDate(today),
        disabled: false,
        color: "primary",
        action: () => markAttendance(today)
      };
    } else {
      // State 5: Today Marked - No Schedule (Success)
      return {
        label: "Today's attendance marked!",
        subtitle: formatDate(today),
        disabled: true,
        color: "success"
      };
    }
  }
}
```

#### Helper Functions

**isScheduledDay(date, schedule)**
- Checks if given date's day of week matches any schedule item
- Example: If schedule has `{day: "Monday", time: "4:00 PM"}`, returns true for any Monday
- Returns: `boolean`

**getScheduledTime(date, schedule)**
- Gets the scheduled time for a given date
- Returns: `string` (e.g., "4:00 PM")

**getNextScheduledClass(schedule, fromDate)**
- Finds the next scheduled class date from given date
- Returns: `{ date: Date, time: string }`

**isAlreadyMarked(date, attendanceRecords)**
- Checks if attendance exists for the given date
- Returns: `boolean`

---

### Use Case Examples

#### Example 1: Regular Schedule Usage
**Setup:**
- Schedule: Mon & Thu @ 4 PM
- Today: Thursday, Dec 12

**Scenario A:** Thu Dec 12 NOT marked yet (State 1)
- **Button Shows:** "MARK TODAY'S ATTENDANCE" + "Thu, Dec 12, 2024" + "4:00 PM"
- **Color:** Blue (active)
- **User Action:** Tap button → Mark Dec 12
- **Result:** Button changes to State 2

**Scenario B:** Thu Dec 12 IS marked (State 2)
- **Button Shows:** "Today's attendance marked!" + "Next class: Mon, Dec 16"
- **Color:** Green (disabled)
- **User Action:** None (can mark past dates via calendar if needed)

---

#### Example 2: Weekend Check (Not Scheduled Today)
**Setup:**
- Schedule: Mon & Thu @ 4 PM
- Today: Saturday, Dec 14
- Last class: Thu Dec 12 (marked ✓)

**State:** Not a scheduled day (State 3)
- **Button Shows:** "Next class: Mon, Dec 16" + "4:00 PM"
- **Color:** Gray (informational)
- **User Action:** None (informational only)
- **Note:** User can still mark attendance via calendar if they attended a makeup class

---

#### Example 3: No Schedule Set
**Setup:**
- Schedule: (empty/undefined)
- Today: Wednesday, Dec 11

**Scenario A:** Dec 11 NOT marked (State 4)
- **Button Shows:** "MARK TODAY'S ATTENDANCE" + "Wed, Dec 11"
- **Color:** Blue (active)
- **User Action:** Tap → Mark Dec 11
- **Result:** Button changes to State 5

**Scenario B:** Dec 11 marked (State 5)
- **Button Shows:** "Today's attendance marked!" + "Wed, Dec 11"
- **Color:** Green (disabled)
- **Note:** User can mark other days via calendar

---

#### Example 4: Coming Back After Missing Classes
**Setup:**
- Schedule: Mon & Thu @ 4 PM
- Today: Monday, Dec 16
- Unmarked past classes: Dec 12, Dec 9, Dec 5, Dec 2

**Button Shows:** "MARK TODAY'S ATTENDANCE" + "Mon, Dec 16, 2024" + "4:00 PM"
**User Action:** Tap → Mark today

**For Past Classes:**
- User scrolls to calendar
- Sees empty circles (○) on Dec 12, Dec 9, Dec 5, Dec 2
- Taps each date individually to mark them
- Calendar updates with filled dots (●)

**Key Difference:** The button ONLY handles TODAY. Past dates are marked via calendar interaction.

---

### Statistics Tiles

```
┌──────────┐ ┌──────────┐ ┌─────────┐
│This Year │ │This Month│ │Remaining│
│    24    │ │    6     │ │   4     │
└──────────┘ └──────────┘ └─────────┘
```

#### Tile 1: This Year
**Calculation:**
```sql
SELECT COUNT(*)
FROM class_attendance
WHERE class_id = ?
  AND YEAR(class_date) = YEAR(CURRENT_DATE)
```
**Reset:** Automatic on January 1st

#### Tile 2: This Month
**Calculation:**
```sql
SELECT COUNT(*)
FROM class_attendance
WHERE class_id = ?
  AND YEAR(class_date) = YEAR(CURRENT_DATE)
  AND MONTH(class_date) = MONTH(CURRENT_DATE)
```
**Reset:** Automatic on 1st of each month

#### Tile 3: Remaining (Prepaid Classes)
**Calculation:**
```javascript
const totalPaid = payments.reduce((sum, p) => sum + p.classes_paid, 0);
const totalAttended = attendanceRecords.length;
const remaining = totalPaid - totalAttended;
```
**Reset:** Never (cumulative)

---

### Financial Summary

```
┌─────────────────────────────────┐
│ Spent this year: INR 12,000     │
│ Cost per class: INR 500         │
└─────────────────────────────────┘
```

#### Spent This Year
**Calculation:**
```sql
SELECT SUM(amount)
FROM payments
WHERE class_id = ?
  AND YEAR(payment_date) = YEAR(CURRENT_DATE)
```
**Reset:** Automatic on January 1st

#### Cost Per Class
**Calculation:**
```javascript
const totalSpentThisYear = paymentsThisYear.reduce((sum, p) => sum + p.amount, 0);
const classesAttendedThisYear = attendanceRecordsThisYear.length;
const costPerClass = classesAttendedThisYear > 0
  ? totalSpentThisYear / classesAttendedThisYear
  : 0;
```
**Note:** Auto-calculated, shows INR 0 if no classes attended this year

---

### Attendance Calendar

```
Attendance Calendar

┌────────────────────────┐ ▼
│    December 2024       │
└────────────────────────┘

S  M  T  W  T  F  S
            1  2  3  4  5
6  7  8  9 10 11 12
    ○     ○     ●     ●
13 14 15 16 17 18 19
    ●     ●
20 21 22 23 24 25 26
        ○     ○
27 28 29 30 31
    ○

○ Scheduled  ● Attended
Tap any past date to mark/unmark
```

#### Month Dropdown
**Options:** Current month + 5 months back (total 6 months)

**Example (December 2024):**
- December 2024 (current)
- November 2024
- October 2024
- September 2024
- August 2024
- July 2024

#### Calendar Visual Legend

| Symbol | Meaning | Interaction |
|--------|---------|-------------|
| ● | Attended (filled green dot) | Tap to remove attendance |
| ○ | Scheduled but not attended (light circle) | Tap to mark attendance |
| (empty) | Not a scheduled day | Tap to mark attendance (if past date) |
| (grey) | Future date | Disabled, cannot interact |

#### Calendar Behavior

**If Schedule Exists:**
- Show light circles (○) on all scheduled days
- Show filled dots (●) on attended days
- Future scheduled days appear greyed out
- Past scheduled days are tappable

**If No Schedule:**
- Calendar shows only filled dots (●) for attended days
- Any past date is tappable to add attendance
- Future dates are greyed out

**Interaction:**
- **Tap empty date (past):** Add attendance for that date
- **Tap filled dot:** Remove attendance for that date (with confirmation)
- **Tap future date:** No action (disabled)

---

### Payment Section

```
┌──────────────────────────────┐
│  💰 RECORD PAYMENT           │
└──────────────────────────────┘

Payment History (2024)

Dec 1, 2024              INR 4,000  ⋮
8 classes

Nov 1, 2024              INR 4,000  ⋮
8 classes

Oct 1, 2024              INR 4,000  ⋮
8 classes
```

#### Payment History Scope
- **Filter:** Only show payments where `YEAR(payment_date) = current year`
- **Purpose:** Matches "Spent this year" metric scope
- **Sort:** Most recent first (DESC by payment_date)

#### Payment Actions
- Tap "RECORD PAYMENT" button → Navigate to payment recording screen
- Tap ⋮ menu on payment → Options to edit/delete payment

---

### Delete Class Section

```
┌─────────────────────────────────┐
│      🗑️ Delete Class            │
└─────────────────────────────────┘
```

**Action:** Delete class with confirmation
**Cascade:** Should also delete related attendance records, payments, and subscriptions

---

## Technical Implementation Notes

### Key Functions to Implement

1. **getScheduledDaysInMonth(classSchedule, year, month)**
   - Returns array of dates that match the schedule for given month
   - Used to show circles on calendar

2. **isScheduledDay(date, schedule)**
   - Checks if a specific date matches any schedule item
   - Returns boolean

3. **getScheduledTime(date, schedule)**
   - Gets the time for a scheduled day
   - Returns string (e.g., "4:00 PM")

4. **getNextScheduledClass(schedule, fromDate)**
   - Finds next scheduled class date from given date
   - Returns `{ date: Date, time: string }`

5. **isAlreadyMarked(date, attendanceRecords)**
   - Checks if attendance exists for given date
   - Returns boolean

6. **calculateMetrics(attendanceRecords, payments)**
   - Returns object with all tile values (this year, this month, remaining)
   - Includes financial calculations (spent this year, cost per class)

### State Management

**Component State:**
```typescript
interface ClassDetailState {
  classData: Class;
  attendanceRecords: ClassAttendance[];
  payments: Payment[];
  selectedMonth: Date;  // For calendar dropdown
  buttonState: {
    label: string;
    subtitle: string;
    disabled: boolean;
    color: 'primary' | 'success' | 'neutral';
    action?: () => void;
  };
}
```

### Performance Considerations

- Cache attendance records to avoid re-querying on every state change
- Use React.memo for calendar cells (31+ components)
- Debounce month dropdown changes
- Optimize date calculations (use date-fns or similar library)

---

## User Flows

### Flow 1: Quick Mark Today (Most Common - 80% of usage)
```
1. User opens class detail page
2. Button shows "MARK TODAY'S ATTENDANCE"
3. User taps button
4. Attendance recorded immediately
5. Button changes to "MARKED TODAY" (success state)
6. Metrics update automatically

Total: 1 tap, ~2 seconds
```

### Flow 2: Mark Past Date via Calendar
```
1. User scrolls to calendar
2. User selects month from dropdown (if needed)
3. User taps empty/scheduled date
4. Date gets filled dot (●)
5. Metrics update automatically

Total: 1-2 taps
```

### Flow 3: Fix Mistake (Remove Wrong Date)
```
1. User scrolls to calendar
2. User finds incorrect date with filled dot
3. User taps filled dot
4. Confirmation dialog: "Remove attendance for [date]?"
5. User confirms
6. Dot disappears, metrics update

Total: 2 taps
```

### Flow 4: Catch Up After Missing Classes
```
1. User opens class detail page
2. Button shows "MARK TODAY'S ATTENDANCE" (if today is scheduled)
3. User taps → Today marked
4. Button updates to show "Next class: [date]" or success message
5. User scrolls to calendar section
6. User taps each unmarked scheduled day (shown as ○)
7. Each tap marks that date and updates metrics

Total: 1 tap for today + N taps for N missed classes (via calendar)
```

---

## Design Specifications

### Colors

| Element | State | Color |
|---------|-------|-------|
| Mark Today Button | Active | Blue (#2563EB) |
| Today Marked Button | Disabled | Green (#10B981) with light bg |
| Next Class Info Button | Disabled | Gray (#6B7280) with light bg |
| Attended dot | Default | Green (#10B981) |
| Scheduled circle | Default | Gray (#D1D5DB) |
| Future dates | Disabled | Gray (#9CA3AF) |

### Typography

- **Button Labels:** 16px, Bold, White (on active buttons)
- **Button Sublabels:** 14px, Regular
- **Tile Numbers:** 32px, Bold
- **Tile Labels:** 12px, Regular, Gray
- **Calendar Dates:** 14px, Regular
- **Calendar Legend:** 12px, Regular, Gray

### Spacing

- Button top padding: 16px
- Section gaps: 24px
- Tile gaps: 12px
- Calendar cell padding: 8px
- Page horizontal padding: 16px

---

## Success Metrics

### Primary Metrics
1. **Time to mark attendance:** Target < 3 seconds
2. **Error rate:** Target < 2% (wrong dates marked)
3. **Calendar usage for past dates:** Track how often users mark past dates via calendar

### Secondary Metrics
1. **Calendar usage:** % of users who mark past dates
2. **Payment tracking engagement:** % viewing payment section
3. **Schedule adoption:** % of classes with schedule set

---

## Future Enhancements

### Phase 2
- Push notifications for scheduled classes
- Bulk mark attendance (select multiple dates)
- Attendance patterns visualization (heatmap)
- Export attendance records (CSV/PDF)

### Phase 3
- Recurring payment automation
- Multi-student attendance (family member linking)
- Class attendance reports (monthly summaries)
- Integration with calendar apps (Google Calendar, etc.)

---

## Edge Cases

### Schedule Edge Cases
1. **Schedule changes mid-month:** Old scheduled days remain as circles, new schedule applies going forward
2. **Multiple classes same day:** Each marked separately (one attendance record per class)
3. **Irregular schedule:** User can still mark manually via calendar

### Data Edge Cases
1. **No payments recorded:** "Remaining" shows negative number or 0
2. **No attendance this year:** "Cost per class" shows INR 0
3. **Future attendance marked (data corruption):** Filter out, show warning
4. **Duplicate attendance same date:** Prevent duplicate inserts via unique constraint

### UI Edge Cases
1. **Very long class names:** Truncate with ellipsis after 30 characters
2. **No schedule, no attendance:** Show empty state with helpful message
3. **No next scheduled class found:** Handle gracefully (e.g., schedule might be incomplete)
4. **Month dropdown at year boundary:** Handle Dec → Jan transition correctly

---

## Accessibility

- All buttons have proper ARIA labels
- Calendar dates are keyboard navigable
- Color is not the only indicator (use icons + text)
- Touch targets minimum 44x44 pixels
- Screen reader announces attendance changes

---

## Testing Checklist

### Unit Tests
- [ ] Button state logic with various date/schedule combinations (5 states)
- [ ] Metric calculations (this year, this month, remaining)
- [ ] Date helper functions (isScheduledDay, getScheduledTime, getNextScheduledClass)
- [ ] Cost per class calculation edge cases

### Integration Tests
- [ ] Mark attendance → metrics update
- [ ] Remove attendance → metrics update
- [ ] Change month → calendar re-renders correctly
- [ ] Schedule present → circles appear on calendar

### E2E Tests
- [ ] Complete flow: open page → mark today → verify in database
- [ ] Complete flow: mark past date via calendar → verify metrics
- [ ] Complete flow: mark today + multiple past dates via calendar
- [ ] Complete flow: remove incorrect date → verify metrics recalc
- [ ] Test all 5 button states render correctly

---

## Dependencies

### Libraries
- `date-fns` - Date manipulation and formatting
- `react-native-calendars` or custom calendar component
- Supabase client - Database queries
- Zustand - State management (existing)

### Database Queries

**Get Attendance Records:**
```sql
SELECT * FROM class_attendance
WHERE class_id = ?
  AND user_id = ?
ORDER BY class_date DESC;
```

**Get This Year Payments:**
```sql
SELECT * FROM payments
WHERE class_id = ?
  AND user_id = ?
  AND YEAR(payment_date) = YEAR(CURRENT_DATE)
ORDER BY payment_date DESC;
```

**Insert Attendance:**
```sql
INSERT INTO class_attendance (id, family_member_id, class_id, class_date, user_id)
VALUES (?, ?, ?, ?, ?);
```

**Delete Attendance:**
```sql
DELETE FROM class_attendance
WHERE class_id = ?
  AND class_date = ?
  AND user_id = ?;
```

---

## Open Questions

1. Should "cost per class" calculation include only this year or all time?
   - **Decision:** This year only (matches "Spent this year" scope)

2. Should we show a calendar for future months to plan ahead?
   - **Decision:** No, focus on current + 5 back (historical view only)

3. What happens if user marks attendance for a date with no payment?
   - **Decision:** Allow it, "Remaining" can go negative (shows user needs to pay)

4. Should we track attendance time (not just date)?
   - **Decision:** Phase 2 enhancement

5. How to handle multiple family members in same class?
   - **Decision:** Phase 3, for now each subscription is tracked separately

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-12-15 | 1.0 | Initial PRD created | - |
| 2025-11-26 | 2.0 | Simplified button logic - removed "mark missed class" state, focus on TODAY only. Past dates handled via calendar. | - |

