---
title: Insights Screen - Product Requirements Document
version: 1.0.0
date: 2025-12-12
status: Draft
---

# Insights Screen - Product Requirements Document

## Overview
The Insights screen provides actionable data about attendance patterns and spending across family members and classes. It adapts intelligently to available data (attendance, schedule, payments) and offers both individual and family-level views.

---

## Core Jobs To Be Done

### JTBD 1: Help me see who's attending what and spot patterns
**User Need:** "Show me attendance patterns - who's consistent, who's dropping off, which classes are neglected"

**Value:**
- Identify engagement issues before they become problems
- Understand attendance trends over time
- Compare family members' participation
- Find classes that haven't been attended recently

### JTBD 2: Help me understand my spending and if I'm getting value
**User Need:** "Where's my money going? Am I getting my money's worth?"

**Value:**
- Track spending across classes and family members
- Calculate actual cost per class attended
- Identify value opportunities (high spend, low attendance)
- Make informed decisions about class investments

---

## Data Model Reference

```typescript
interface Class {
  id: string;
  name: string;
  type?: string;
  instructor?: string;
  schedule?: ScheduleItem[];  // Optional - not all classes have this
  status: 'active' | 'paused';
  // ... other fields
}

interface ClassAttendance {
  id: string;
  family_member_id: string;
  class_id: string;
  class_date: string;  // ISO date
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
  user_id: string;
}

interface ClassSubscription {
  id: string;
  family_member_id: string;
  class_id: string;
  user_id: string;
}
```

---

## Screen Layout

### Header with View Selector

```
┌─────────────────────────────────────────┐
│  Insights                               │
├─────────────────────────────────────────┤
│                                         │
│  Select Family Member                   │
│  ┌───────────────────────────────────┐ │
│  │ All Family                      ▼ │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**
- Dropdown selector at top of screen
- Tap to open modal/bottom sheet with options:
  - All Family (default)
  - Sarah
  - Tom
  - Mom
- "All Family" shows aggregated family-level insights
- Individual member selection shows per-member deep dive
- Selection persists across app sessions
- Dropdown shows currently selected member/option

---

## JTBD 1: Attendance Insights

### Section A: Attendance Overview

#### Individual Member View

```
┌─────────────────────────────────────────┐
│  Sarah - Attendance Overview            │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Attendance Trend (Last 6 Months) │ │
│  │                                   │ │
│  │      ▂▄▆▇█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │    Add Missing Attendance         │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Data Displayed:**
- **Bar Chart:** Monthly attendance for last 6 months showing visual trend
- **Add Missing Attendance Button:** Opens the individual's class page where they can mark attendance across all their classes

**Navigation:**
- Tapping "Add Missing Attendance" navigates to the selected family member's class detail page (e.g., if viewing Sarah's insights, opens Sarah's class page)
- This provides quick access to mark attendance without leaving the insights context

**Calculations:**
```javascript
// Trend Data (last 6 months)
const months = eachMonthOfInterval({
  start: subMonths(new Date(), 5),
  end: new Date()
});

const trendData = months.map(month => ({
  month: format(month, 'MMM'),
  count: attendanceRecords.filter(a =>
    isSameMonth(new Date(a.class_date), month)
  ).length
}));
```

**Empty State:**
```
┌─────────────────────────────────────────┐
│  Sarah - Attendance Overview            │
├─────────────────────────────────────────┤
│                                         │
│  No attendance records yet              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │      Mark Attendance              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  See patterns and trends with           │
│  up to date attendance records          │
│                                         │
└─────────────────────────────────────────┘
```

**Navigation:**
- Tapping "Mark Attendance" navigates to the selected family member's class detail page
- This provides a direct path from empty state to taking action

#### Family View

```
┌─────────────────────────────────────────┐
│  Family Attendance Comparison           │
├─────────────────────────────────────────┤
│                                         │
│  👧 Sarah                               │
│  ┌───────────────────────────────────┐ │
│  │  Attendance Trend (Last 6 Months) │ │
│  │      ▂▄▆▇█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Add any missing attendance for    │ │
│  │ Sarah                             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  👦 Tom                                 │
│  ┌───────────────────────────────────┐ │
│  │  Attendance Trend (Last 6 Months) │ │
│  │      ▃▅▄▆▅▄                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Add any missing attendance for    │ │
│  │ Tom                               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  👩 Mom                                 │
│  ┌───────────────────────────────────┐ │
│  │  Attendance Trend (Last 6 Months) │ │
│  │      ▂▃▃▄▃▂                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Add any missing attendance for    │ │
│  │ Mom                               │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Data Displayed:**
- Each family member shown as a card
- 6-month attendance trend chart (if data available)
- "Add any missing attendance for <member name>" button for each member
- Sorted by attendance count (highest first)

**Button Behavior:**
- Each member has their own "Add any missing attendance" button
- Button is displayed regardless of whether attendance data exists
- Tapping the button navigates to that specific member's class detail page
- Provides quick access to mark attendance for any family member

**Empty State (No Attendance for a Member):**
```
┌─────────────────────────────────────────┐
│  👦 Tom                                 │
│  ┌───────────────────────────────────┐ │
│  │  No attendance records yet        │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Add any missing attendance for    │ │
│  │ Tom                               │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Difference:** Family view shows COMPARISON (side-by-side member activity), not totals

**Calculations (Per Family Member):**
```javascript
// For each family member, calculate 6-month trend
const months = eachMonthOfInterval({
  start: subMonths(new Date(), 5),
  end: new Date()
});

const memberTrendData = months.map(month => ({
  month: format(month, 'MMM'),
  count: allAttendance.filter(a =>
    a.family_member_id === member.id &&
    isSameMonth(new Date(a.class_date), month)
  ).length
}));
```

**Navigation:**
- Each "Add any missing attendance for <member name>" button navigates to that specific family member's class detail page
- This provides quick access to mark attendance for any family member from the comparison view

---

### Section B: Per-Class Breakdown (Individual View Only)

```
┌─────────────────────────────────────────┐
│  Sarah's Classes                        │
├─────────────────────────────────────────┤
│                                         │
│  🎹 Piano Lessons                       │
│  Last attended: 2 days ago ✅           │
│  This month: 6 classes                  │
│  [If schedule] Attendance: 6/8 (75%)   │
│  [If schedule] Missed: Dec 5, Dec 9     │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  🏊 Swimming                            │
│  Last attended: 45 days ago ⚠️          │
│  This month: 0 classes                  │
│  [If schedule] Attendance: 0/8 (0%)    │
│  [If schedule] Missing all classes!     │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  💃 Dance (no schedule set)             │
│  Last attended: 2 days ago ✅           │
│  This month: 12 classes                 │
│  Frequency: ~3x per week                │
│                                         │
└─────────────────────────────────────────┘
```

**Visual Indicators:**
- ✅ Green dot: Attended within last 7 days
- ⚠️ Amber dot: Not attended for 14-30 days
- 🔴 Red dot: Not attended for 30+ days

**Data Displayed Per Class:**

**Always Shown (requires only attendance):**
- Days since last attended
- Count this month
- Frequency calculation (if no schedule)

**Enhanced with Schedule:**
- Attendance rate (attended / scheduled)
- Specific missed dates
- Warning if missing many classes

**Calculations:**
```javascript
// Days since last attended
const lastAttendance = maxBy(attendanceRecords, 'class_date');
const daysSince = differenceInDays(new Date(), new Date(lastAttendance.class_date));

// This month count
const thisMonthCount = attendanceRecords.filter(a =>
  isSameMonth(new Date(a.class_date), new Date())
).length;

// Frequency (no schedule)
const avgPerWeek = thisMonthCount / (daysInMonth(new Date()) / 7);

// Attendance rate (with schedule)
if (classSchedule) {
  const scheduledDays = getScheduledDaysInMonth(classSchedule, new Date());
  const attendedDays = attendanceRecords.filter(a =>
    isSameMonth(new Date(a.class_date), new Date())
  ).length;
  const rate = (attendedDays / scheduledDays.length) * 100;

  // Find missed dates
  const missedDates = scheduledDays.filter(scheduledDate =>
    !attendanceRecords.some(a =>
      isSameDay(new Date(a.class_date), scheduledDate)
    )
  );
}
```

**Missing Data Nudges:**
```
Add schedule to see:
• Attendance rate
• Missed classes
• Upcoming sessions
```

---

### Section C: At-Risk Classes (Family View Only)

```
┌─────────────────────────────────────────┐
│  Classes Needing Attention              │
├─────────────────────────────────────────┤
│                                         │
│  🔴 Swimming (Tom)                      │
│  Last attended: 45 days ago             │
│  This month: 0/8 classes                │
│                                         │
│  🟡 Piano (Sarah)                       │
│  Last attended: 14 days ago             │
│  This month: 2/8 classes (25%)          │
│                                         │
└─────────────────────────────────────────┘
```

**Logic:**
- Shows classes with low attendance or long gaps
- Prioritized by severity:
  1. 🔴 Not attended in 30+ days
  2. 🟡 Not attended in 14-30 days OR < 50% attendance rate
- Empty state: "All classes have good attendance!"

---

## JTBD 2: Spending Insights

### Section D: Spending Overview

#### Individual Member View

```
┌─────────────────────────────────────────┐
│  Sarah - Spending Overview              │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │This Month  │  │This Year   │        │
│  │ $1,200     │  │  $12,000   │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Monthly Spending (Last 6 Months) │ │
│  │                                   │ │
│  │      ▂▄▆▅█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [If attendance exists]                │
│  ┌────────────┐                        │
│  │Cost/Class  │                        │
│  │   $50      │                        │
│  └────────────┘                        │
│                                         │
└─────────────────────────────────────────┘
```

**Data Displayed:**
- **This Month:** Sum of payments made this month
- **This Year:** Sum of payments made this calendar year
- **Spending Trend:** Bar chart of monthly spending (last 6 months)
- **Cost per Class:** Only shown if attendance data exists

**Calculations:**
```javascript
// This Month
const thisMonthSpending = payments
  .filter(p => isSameMonth(new Date(p.payment_date), new Date()))
  .reduce((sum, p) => sum + p.amount, 0);

// This Year
const thisYearSpending = payments
  .filter(p => isSameYear(new Date(p.payment_date), new Date()))
  .reduce((sum, p) => sum + p.amount, 0);

// Monthly Trend
const months = eachMonthOfInterval({
  start: subMonths(new Date(), 5),
  end: new Date()
});

const spendingTrend = months.map(month => ({
  month: format(month, 'MMM'),
  amount: payments
    .filter(p => isSameMonth(new Date(p.payment_date), month))
    .reduce((sum, p) => sum + p.amount, 0)
}));

// Cost per class (if attendance exists)
if (attendanceRecords.length > 0) {
  const totalSpent = thisYearSpending;
  const totalAttended = attendanceRecords.filter(a =>
    isSameYear(new Date(a.class_date), new Date())
  ).length;

  const costPerClass = totalAttended > 0 ? totalSpent / totalAttended : 0;
}
```

**Missing Data Nudges:**
```
┌─────────────────────────────────────────┐
│  No payment data yet                    │
│                                         │
│  Record payments to track:              │
│  • Monthly spending                     │
│  • Yearly totals                        │
│  • Cost per class                       │
│                                         │
│  [Record Payment] button                │
└─────────────────────────────────────────┘
```

#### Family View

```
┌─────────────────────────────────────────┐
│  Family Spending Overview               │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │This Month  │  │This Year   │        │
│  │ $2,400     │  │  $28,000   │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  Spending by Member                     │
│                                         │
│  👧 Sarah: $1,200 (50%)                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━            │
│                                         │
│  👦 Tom: $800 (33%)                    │
│  ━━━━━━━━━━━━━━━━                     │
│                                         │
│  👩 Mom: $400 (17%)                    │
│  ━━━━━━━━                             │
│                                         │
└─────────────────────────────────────────┘
```

**Key Insight:** Family view shows TOTALS for spending (unlike attendance which shows comparison)

**Data Displayed:**
- Total family spending this month
- Total family spending this year
- Per-member spending breakdown with percentages
- Visual bars showing relative distribution
- Sorted by spending amount (highest first)

**Calculations:**
```javascript
// Family totals
const familyThisMonth = allPayments
  .filter(p => isSameMonth(new Date(p.payment_date), new Date()))
  .reduce((sum, p) => sum + p.amount, 0);

const familyThisYear = allPayments
  .filter(p => isSameYear(new Date(p.payment_date), new Date()))
  .reduce((sum, p) => sum + p.amount, 0);

// Per-member breakdown
const memberSpending = familyMembers.map(member => {
  const memberPayments = allPayments
    .filter(p => p.family_member_id === member.id)
    .filter(p => isSameMonth(new Date(p.payment_date), new Date()));

  const total = memberPayments.reduce((sum, p) => sum + p.amount, 0);
  const percentage = familyThisMonth > 0 ? (total / familyThisMonth) * 100 : 0;

  return {
    name: member.name,
    avatar: member.avatar,
    amount: total,
    percentage
  };
}).filter(m => m.amount > 0)
  .sort((a, b) => b.amount - a.amount);
```

---

### Section E: Spending by Class (Individual View Only)

```
┌─────────────────────────────────────────┐
│  Sarah's Class Spending                 │
├─────────────────────────────────────────┤
│                                         │
│  🎹 Piano Lessons                       │
│  This month: $600                       │
│  This year: $6,000                      │
│  [If attendance] Cost/class: $50        │
│  [If schedule + attendance] ROI: Good   │
│      (6/8 classes, $50 vs $45 expected) │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  🏊 Swimming                            │
│  This month: $320                       │
│  This year: $3,200                      │
│  [If attendance] Cost/class: $—         │
│      (No attendance tracked)            │
│  ⚠️ Spending but not attending!         │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  💃 Dance (no payments tracked)         │
│  Add payment info to see spending       │
│                                         │
└─────────────────────────────────────────┘
```

**Data Per Class:**

**Always Shown (if payments exist):**
- Spending this month
- Spending this year

**Enhanced with Attendance:**
- Actual cost per class (total spent / total attended)
- Warning if spending but no attendance

**Enhanced with Schedule + Attendance + Payments:**
- ROI calculation comparing actual vs expected cost
- Attendance rate impact on value

**ROI Calculation:**
```javascript
// Expected cost per class (from subscription setup)
const expectedCost = totalPaid / classesPaid;

// Actual cost per class
const actualCost = totalSpent / totalAttended;

// ROI Assessment
if (actualCost <= expectedCost) {
  roi = "Good - getting expected value";
} else if (actualCost <= expectedCost * 1.2) {
  roi = "Fair - attending most classes";
} else {
  roi = "Poor - missing too many classes";
}

// If schedule exists, show attendance context
if (schedule) {
  const rate = (totalAttended / totalScheduled) * 100;
  roi += ` (${rate}% attendance)`;
}
```

**Missing Data Nudges:**
```
Add payment info to see spending
Add attendance to see cost per class
Add schedule to see value analysis
```

---

### Section F: Value Analysis (Individual View Only)

```
┌─────────────────────────────────────────┐
│  Value Insights                         │
├─────────────────────────────────────────┤
│                                         │
│  💎 Best Value                          │
│  Dance: $20/class (attending 12x/month) │
│                                         │
│  💸 Highest Spend                       │
│  Piano: $600/month                      │
│                                         │
│  ⚠️ Low Value                           │
│  Swimming: $320 spent, 0 classes        │
│                                         │
└─────────────────────────────────────────┘
```

**Only shown when:** Multiple classes with both payment and attendance data

**Insights:**
- **Best Value:** Lowest cost per class
- **Highest Spend:** Most money spent this month
- **Low Value:** High spending but low/no attendance

---

## Progressive Data Enhancement

### Scenario Matrix

| Has Attendance | Has Schedule | Has Payments | What Shows |
|---------------|--------------|--------------|------------|
| ✅ | ❌ | ❌ | Basic attendance patterns, frequency |
| ✅ | ✅ | ❌ | Attendance patterns, missed classes, rates |
| ✅ | ❌ | ✅ | Attendance + spending + cost per class |
| ✅ | ✅ | ✅ | Full insights: patterns, spending, ROI |
| ❌ | ❌ | ✅ | Spending only, nudge to add attendance |
| ❌ | ✅ | ❌ | Schedule info, nudge to mark attendance |

### Empty State Hierarchy

**Priority 1:** No data at all
```
┌─────────────────────────────────────────┐
│          No data yet                    │
│                                         │
│  Start by:                              │
│  1. Adding family members               │
│  2. Creating classes                    │
│  3. Marking attendance                  │
│  4. Recording payments                  │
│                                         │
└─────────────────────────────────────────┘
```

**Priority 2:** Has classes but no attendance
```
┌─────────────────────────────────────────┐
│     No attendance records yet           │
│                                         │
│  Mark attendance in class details       │
│  to see insights here                   │
│                                         │
│  [View Classes] button                  │
└─────────────────────────────────────────┘
```

**Priority 3:** Has attendance but no payments (spending section only)
```
┌─────────────────────────────────────────┐
│     No payment data yet                 │
│                                         │
│  Record payments to see:                │
│  • Monthly spending                     │
│  • Cost per class                       │
│  • Value analysis                       │
│                                         │
│  [Record Payment] button                │
└─────────────────────────────────────────┘
```

---

## Wireframes

### Full Screen - Individual View (All Data Available)

```
┌─────────────────────────────────────────┐
│  Insights                         [≡]   │
├─────────────────────────────────────────┤
│                                         │
│  Select Family Member                   │
│  ┌───────────────────────────────────┐ │
│  │ Sarah                           ▼ │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  ATTENDANCE INSIGHTS                    │
├─────────────────────────────────────────┤
│                                         │
│  Attendance Trend (Last 6 Months)       │
│  ┌───────────────────────────────────┐ │
│  │      ▂▄▆▇█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │    Add Missing Attendance         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Sarah's Classes                        │
│  ┌───────────────────────────────────┐ │
│  │ 🎹 Piano Lessons                  │ │
│  │ Last: 2 days ago ✅               │ │
│  │ This month: 6 classes             │ │
│  │ Attendance: 6/8 (75%)             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🏊 Swimming                       │ │
│  │ Last: 45 days ago ⚠️              │ │
│  │ This month: 0 classes             │ │
│  │ Attendance: 0/8 (0%)              │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  SPENDING INSIGHTS                      │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │This Month  │  │This Year   │        │
│  │  $1,200    │  │  $12,000   │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  ┌────────────┐                        │
│  │Cost/Class  │                        │
│  │   $50      │                        │
│  └────────────┘                        │
│                                         │
│  Monthly Spending (Last 6 Months)       │
│  ┌───────────────────────────────────┐ │
│  │      ▂▄▆▅█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Sarah's Class Spending                 │
│  ┌───────────────────────────────────┐ │
│  │ 🎹 Piano Lessons                  │ │
│  │ This month: $600                  │ │
│  │ Cost/class: $50                   │ │
│  │ ROI: Good (75% attendance)        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🏊 Swimming                       │ │
│  │ This month: $320                  │ │
│  │ ⚠️ Spending but not attending!    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Value Insights                         │
│  ┌───────────────────────────────────┐ │
│  │ 💎 Best Value: Piano ($50/class)  │ │
│  │ 💸 Highest Spend: Piano ($600)    │ │
│  │ ⚠️ Low Value: Swimming (unused)   │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Full Screen - Family View

```
┌─────────────────────────────────────────┐
│  Insights                         [≡]   │
├─────────────────────────────────────────┤
│                                         │
│  Select Family Member                   │
│  ┌───────────────────────────────────┐ │
│  │ All Family                      ▼ │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  FAMILY ATTENDANCE                      │
├─────────────────────────────────────────┤
│                                         │
│  Family Attendance Comparison           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👧 Sarah                          │ │
│  │                                   │ │
│  │ Attendance Trend (Last 6 Months)  │ │
│  │      ▂▄▆▇█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  │                                   │ │
│  │ ┌───────────────────────────────┐ │ │
│  │ │ Add any missing attendance    │ │ │
│  │ │ for Sarah                     │ │ │
│  │ └───────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👦 Tom                            │ │
│  │                                   │ │
│  │ Attendance Trend (Last 6 Months)  │ │
│  │      ▃▅▄▆▅▄                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  │                                   │ │
│  │ ┌───────────────────────────────┐ │ │
│  │ │ Add any missing attendance    │ │ │
│  │ │ for Tom                       │ │ │
│  │ └───────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👩 Mom                            │ │
│  │                                   │ │
│  │ Attendance Trend (Last 6 Months)  │ │
│  │      ▂▃▃▄▃▂                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  │                                   │ │
│  │ ┌───────────────────────────────┐ │ │
│  │ │ Add any missing attendance    │ │ │
│  │ │ for Mom                       │ │ │
│  │ └───────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Classes Needing Attention              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🔴 Swimming (Tom)                 │ │
│  │ Last: 45 days ago                 │ │
│  │ This month: 0/8 classes           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🟡 Piano (Sarah)                  │ │
│  │ Last: 14 days ago                 │ │
│  │ This month: 2/8 classes (25%)     │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  FAMILY SPENDING                        │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │This Month  │  │This Year   │        │
│  │  $2,400    │  │  $28,000   │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  Spending by Member                     │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👧 Sarah: $1,200 (50%)            │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👦 Tom: $800 (33%)                │ │
│  │ ━━━━━━━━━━━━━━━━               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👩 Mom: $400 (17%)                │ │
│  │ ━━━━━━━━                        │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technical Implementation

### Data Fetching Strategy

```typescript
interface InsightsData {
  familyMembers: FamilyMember[];
  classes: Class[];
  allAttendance: ClassAttendance[];
  allPayments: Payment[];
  subscriptions: ClassSubscription[];
}

async function loadInsightsData(): Promise<InsightsData> {
  const [
    familyMembers,
    classes,
    allAttendance,
    allPayments,
    subscriptions
  ] = await Promise.all([
    fetchAllFamilyMembers(),
    fetchAllClasses(),
    fetchAllAttendance(),
    fetchAllPayments(),
    fetchAllSubscriptions()
  ]);

  return {
    familyMembers,
    classes,
    allAttendance,
    allPayments,
    subscriptions
  };
}
```

### Key Helper Functions

```typescript
// Filter data by selected member
function filterByMember(
  data: InsightsData,
  memberId: string | null
): FilteredData {
  if (!memberId) return data; // Family view

  return {
    ...data,
    allAttendance: data.allAttendance.filter(
      a => a.family_member_id === memberId
    ),
    allPayments: data.allPayments.filter(
      p => p.family_member_id === memberId
    ),
    subscriptions: data.subscriptions.filter(
      s => s.family_member_id === memberId
    )
  };
}

// Calculate attendance metrics
function calculateAttendanceMetrics(
  attendance: ClassAttendance[]
): AttendanceMetrics {
  const now = new Date();

  const thisMonth = attendance.filter(a =>
    isSameMonth(new Date(a.class_date), now)
  ).length;

  const lastMonth = attendance.filter(a =>
    isSameMonth(new Date(a.class_date), subMonths(now, 1))
  ).length;

  const change = thisMonth - lastMonth;

  const trend = eachMonthOfInterval({
    start: subMonths(now, 5),
    end: now
  }).map(month => ({
    month: format(month, 'MMM'),
    count: attendance.filter(a =>
      isSameMonth(new Date(a.class_date), month)
    ).length
  }));

  return { thisMonth, lastMonth, change, trend };
}

// Calculate spending metrics
function calculateSpendingMetrics(
  payments: Payment[],
  attendance: ClassAttendance[]
): SpendingMetrics {
  const now = new Date();

  const thisMonth = payments
    .filter(p => isSameMonth(new Date(p.payment_date), now))
    .reduce((sum, p) => sum + p.amount, 0);

  const thisYear = payments
    .filter(p => isSameYear(new Date(p.payment_date), now))
    .reduce((sum, p) => sum + p.amount, 0);

  const thisYearAttendance = attendance.filter(a =>
    isSameYear(new Date(a.class_date), now)
  ).length;

  const costPerClass = thisYearAttendance > 0
    ? thisYear / thisYearAttendance
    : 0;

  const trend = eachMonthOfInterval({
    start: subMonths(now, 5),
    end: now
  }).map(month => ({
    month: format(month, 'MMM'),
    amount: payments
      .filter(p => isSameMonth(new Date(p.payment_date), month))
      .reduce((sum, p) => sum + p.amount, 0)
  }));

  return { thisMonth, thisYear, costPerClass, trend };
}

// Get per-class breakdown
function getPerClassBreakdown(
  classes: Class[],
  attendance: ClassAttendance[],
  payments: Payment[],
  memberId: string
): ClassBreakdown[] {
  const memberClasses = classes.filter(c =>
    attendance.some(a =>
      a.class_id === c.id && a.family_member_id === memberId
    ) ||
    payments.some(p =>
      p.class_id === c.id && p.family_member_id === memberId
    )
  );

  return memberClasses.map(cls => {
    const classAttendance = attendance.filter(
      a => a.class_id === cls.id && a.family_member_id === memberId
    );
    const classPayments = payments.filter(
      p => p.class_id === cls.id && p.family_member_id === memberId
    );

    // Attendance metrics
    const lastAttended = maxBy(classAttendance, 'class_date');
    const daysSince = lastAttended
      ? differenceInDays(new Date(), new Date(lastAttended.class_date))
      : null;

    const thisMonth = classAttendance.filter(a =>
      isSameMonth(new Date(a.class_date), new Date())
    ).length;

    // Schedule-based metrics
    let attendanceRate = null;
    let missedDates = [];
    if (cls.schedule) {
      const scheduled = getScheduledDaysInMonth(cls.schedule, new Date());
      attendanceRate = scheduled.length > 0
        ? (thisMonth / scheduled.length) * 100
        : 0;

      missedDates = scheduled.filter(date =>
        !classAttendance.some(a =>
          isSameDay(new Date(a.class_date), date)
        )
      );
    }

    // Spending metrics
    const monthSpending = classPayments
      .filter(p => isSameMonth(new Date(p.payment_date), new Date()))
      .reduce((sum, p) => sum + p.amount, 0);

    const yearSpending = classPayments
      .filter(p => isSameYear(new Date(p.payment_date), new Date()))
      .reduce((sum, p) => sum + p.amount, 0);

    const costPerClass = classAttendance.length > 0
      ? yearSpending / classAttendance.length
      : null;

    return {
      class: cls,
      daysSince,
      thisMonth,
      attendanceRate,
      missedDates,
      monthSpending,
      yearSpending,
      costPerClass
    };
  });
}

// Get at-risk classes
function getAtRiskClasses(
  breakdown: ClassBreakdown[]
): AtRiskClass[] {
  return breakdown
    .filter(b => {
      // Not attended in 14+ days
      if (b.daysSince && b.daysSince >= 14) return true;

      // Low attendance rate
      if (b.attendanceRate !== null && b.attendanceRate < 50) return true;

      // Spending but not attending
      if (b.monthSpending > 0 && b.thisMonth === 0) return true;

      return false;
    })
    .map(b => ({
      class: b.class,
      severity: b.daysSince >= 30 ? 'high' : 'medium',
      reason: b.daysSince >= 30
        ? `Not attended in ${b.daysSince} days`
        : b.thisMonth === 0 && b.monthSpending > 0
        ? 'Spending but not attending'
        : `Low attendance: ${b.attendanceRate}%`
    }))
    .sort((a, b) => {
      // High severity first
      if (a.severity !== b.severity) {
        return a.severity === 'high' ? -1 : 1;
      }
      return 0;
    });
}

// Family View: Render trend chart for each member
function renderFamilyAttendanceView(
  familyMembers: FamilyMember[],
  allAttendance: ClassAttendance[],
  navigation: any
): JSX.Element {
  return (
    <View>
      {familyMembers.map(member => {
        const memberAttendance = allAttendance.filter(
          a => a.family_member_id === member.id
        );

        const metrics = calculateAttendanceMetrics(memberAttendance);

        return (
          <View key={member.id} style={styles.memberCard}>
            <Text style={styles.memberName}>{member.name}</Text>

            {metrics.trend.length > 0 ? (
              <AttendanceTrendChart data={metrics.trend} />
            ) : (
              <Text style={styles.emptyState}>No attendance records yet</Text>
            )}

            <TouchableOpacity
              style={styles.addAttendanceButton}
              onPress={() => navigation.navigate('FamilyMemberDetail', {
                familyMemberId: member.id
              })}
            >
              <Text style={styles.buttonText}>
                Add any missing attendance for {member.name}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}
```

### State Management

```typescript
interface InsightsState {
  selectedMemberId: string | null;
  data: InsightsData | null;
  loading: boolean;
  error: string | null;
}

// Zustand store
const useInsightsStore = create<InsightsState>((set) => ({
  selectedMemberId: null,
  data: null,
  loading: false,
  error: null,

  setSelectedMember: (id: string | null) =>
    set({ selectedMemberId: id }),

  loadData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await loadInsightsData();
      set({ data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```

---

## UI/UX Guidelines

### Colors

| Element | Color |
|---------|-------|
| Primary cards | White (#FFFFFF) |
| Background | Light gray (#F9FAFB) |
| Dropdown border | Blue (#2563EB) |
| Dropdown text | Dark gray (#1F2937) |
| Positive trend | Green (#10B981) |
| Negative trend | Red (#EF4444) |
| Neutral | Gray (#6B7280) |
| Warning | Amber (#F59E0B) |
| High risk | Red (#DC2626) |
| Medium risk | Amber (#F59E0B) |

### Typography

- **Section headers:** 18px, Bold, #1F2937
- **Card titles:** 16px, SemiBold, #1F2937
- **Metric values:** 32px, Bold, #1F2937
- **Metric labels:** 14px, Regular, #6B7280
- **Body text:** 14px, Regular, #1F2937
- **Small text:** 12px, Regular, #6B7280

### Spacing

- Section padding: 20px horizontal
- Section gaps: 24px vertical
- Card padding: 16px
- Card gaps: 12px
- Chip gaps: 8px

### Animations

- **Trend arrows:** Subtle bounce on render
- **Bar charts:** Animate height from 0 to final
- **Dropdown:** Slide up from bottom (bottom sheet) with fade-in backdrop
- **Data refresh:** Fade out/in transition

---

## Performance Considerations

### Optimization Strategies

1. **Memoize Calculations**
   ```typescript
   const attendanceMetrics = useMemo(
     () => calculateAttendanceMetrics(filteredAttendance),
     [filteredAttendance]
   );
   ```

2. **Virtualize Long Lists**
   - Use FlatList for class breakdowns
   - Only render visible items

3. **Cache Computed Data**
   ```typescript
   // Cache trend data for 5 minutes
   const cachedTrend = useMemo(() => trend, [selectedMemberId]);
   ```

4. **Lazy Load Charts**
   - Render charts only when in viewport
   - Use Intersection Observer

5. **Debounce Member Selection**
   ```typescript
   const debouncedSelect = useMemo(
     () => debounce(setSelectedMember, 150),
     []
   );
   ```

---

## Testing Requirements

### Unit Tests

- [ ] `calculateAttendanceMetrics()` with various date ranges
- [ ] `calculateSpendingMetrics()` with/without attendance
- [ ] `getPerClassBreakdown()` with missing data
- [ ] `getAtRiskClasses()` severity sorting
- [ ] `filterByMember()` for individual vs family view

### Integration Tests

- [ ] Member selection updates all sections
- [ ] Data refresh recomputes all metrics
- [ ] Empty states show appropriate nudges
- [ ] Progressive enhancement based on available data
- [ ] Family view renders trend chart for each member
- [ ] "Add any missing attendance" button navigates to correct member's class page
- [ ] Empty state for individual members shows correctly in family view

### E2E Tests

- [ ] Load insights → See family view with trend charts for all members
- [ ] Open dropdown → See member options
- [ ] Select member → See individual view with "Add Missing Attendance" button
- [ ] Tap "Add missing attendance for <member>" → Navigate to member's class page
- [ ] Tap "Mark Attendance" in empty state → Navigate to member's class page
- [ ] Refresh data → Metrics update
- [ ] Navigate back → Selection persists

---

## Success Metrics

### Engagement

- **Insights View Rate:** % of users who view insights tab (target: 60%+)
- **Member Selection Rate:** % who filter by individual member (target: 40%+)
- **Session Time:** Avg time spent on insights (target: 45+ seconds)

### Actionability

- **Payment Recording After View:** % who record payment after viewing low value warning (target: 20%+)
- **Attendance Marking After View:** % who mark attendance after viewing at-risk classes (target: 30%+)
- **"Add Missing Attendance" Button Usage:** % who tap the button to mark attendance (target: 25%+)
- **Empty State CTA Usage:** % who tap "Mark Attendance" from empty state (target: 40%+)

### Data Quality

- **Schedule Adoption:** % of classes with schedule (influences enhanced insights)
- **Payment Tracking:** % of active classes with payment data

---

## Future Enhancements

### Phase 2: Advanced Insights

- **Attendance Heatmap:** Visual calendar showing attendance patterns
- **Spending Forecast:** Predict next month spending based on trends
- **Class Comparison:** Compare similar classes (e.g., all music classes)
- **Export Reports:** PDF/CSV of insights data

### Phase 3: Predictive Insights

- **Churn Prediction:** AI-powered predictions of classes likely to be dropped
- **Optimization Suggestions:** Recommend class schedule adjustments
- **Budget Alerts:** Notify when approaching spending thresholds
- **Attendance Goals:** Set and track attendance targets

### Phase 4: Social Features

- **Compare with Others:** Anonymous benchmarks (e.g., "avg family spends $X")
- **Achievements:** Badges for attendance streaks
- **Share Reports:** Export beautiful reports to share with co-parents

---

## Open Questions

1. **Currency Display:** Should we convert all to one currency or show mixed?
   - **Decision:** Show native currency, add conversion in Phase 2

2. **Year Boundary:** How to handle Dec → Jan transition for "this year" metrics?
   - **Decision:** Automatic reset on Jan 1, show previous year summary in banner

3. **Multiple Family Accounts:** How to handle if parents share account?
   - **Decision:** Phase 3 feature, for now assume single user

4. **Class Archive:** Should archived/deleted classes show in insights?
   - **Decision:** No, only active classes unless specifically viewing history

---

## Dependencies

### Libraries

- `date-fns` - Date calculations and formatting
- `react-native-charts-wrapper` or custom charts - Data visualization
- `zustand` - State management (existing)
- `@supabase/supabase-js` - Database queries (existing)

### Database Queries

```sql
-- Get all attendance for user
SELECT * FROM class_attendance
WHERE user_id = ?
ORDER BY class_date DESC;

-- Get all payments for user
SELECT * FROM payments
WHERE user_id = ?
ORDER BY payment_date DESC;

-- Get all classes with subscriptions
SELECT c.*, cs.family_member_id
FROM classes c
LEFT JOIN class_subscriptions cs ON c.id = cs.class_id
WHERE c.user_id = ?;

-- Get family members
SELECT * FROM family_members
WHERE user_id = ?
ORDER BY created_at ASC;
```

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-12 | 1.0 | Initial PRD created | - |
| 2025-12-12 | 1.1 | Renamed from "Analytics" to "Insights"; Changed selector from horizontal scrollable chips to dropdown | - |
| 2025-12-12 | 1.2 | Removed "This Month" and "Last Month" summary widgets from attendance overview; 6-month trend chart provides sufficient visual information | - |
| 2025-12-12 | 1.3 | Added "Add Missing Attendance" button below attendance trend chart; Updated empty state with "Mark Attendance" button and clearer CTA text | - |
| 2025-12-12 | 1.4 | Updated Family View to show 6-month trend chart for each member; Added generic "Add any missing attendance for <member name>" button for all members regardless of data availability | - |

---

## Appendix: Design Mockups

### Mobile Views

#### Individual View - Collapsed
```
┌────────────────────┐
│  Insights     [≡]  │
├────────────────────┤
│                    │
│ Select Member      │
│ ┌────────────────┐ │
│ │ Sarah        ▼ │ │
│ └────────────────┘ │
│                    │
│ ATTENDANCE ▼       │
│                    │
│ [Trend Chart]      │
│ (Last 6 Months)    │
│                    │
│ [Add Missing       │
│  Attendance]       │
│                    │
│ Classes ▼          │
│ 🎹 Piano  2d  ✅   │
│ 🏊 Swim  45d  ⚠️   │
│                    │
│ SPENDING ▼         │
│ ┌────────┐         │
│ │ $1,200 │         │
│ │  This  │         │
│ │  Month │         │
│ └────────┘         │
│                    │
└────────────────────┘
```

#### Family View - Collapsed
```
┌────────────────────┐
│  Insights     [≡]  │
├────────────────────┤
│                    │
│ Select Member      │
│ ┌────────────────┐ │
│ │ All Family   ▼ │ │
│ └────────────────┘ │
│                    │
│ ATTENDANCE ▼       │
│                    │
│ 👧 Sarah           │
│ [Trend Chart]      │
│ ▂▄▆▇█▇             │
│ J A S O N D        │
│ ┌────────────────┐ │
│ │ Add missing    │ │
│ │ attendance for │ │
│ │ Sarah          │ │
│ └────────────────┘ │
│ ───────────────    │
│                    │
│ 👦 Tom             │
│ [Trend Chart]      │
│ ▃▅▄▆▅▄             │
│ J A S O N D        │
│ ┌────────────────┐ │
│ │ Add missing    │ │
│ │ attendance for │ │
│ │ Tom            │ │
│ └────────────────┘ │
│ ───────────────    │
│                    │
│ 👩 Mom             │
│ [Trend Chart]      │
│ ▂▃▃▄▃▂             │
│ J A S O N D        │
│ ┌────────────────┐ │
│ │ Add missing    │ │
│ │ attendance for │ │
│ │ Mom            │ │
│ └────────────────┘ │
│                    │
│ At Risk ▼          │
│ 🔴 Swim (Tom)      │
│ 🟡 Piano (Sarah)   │
│                    │
│ SPENDING ▼         │
│ Total: $2,400      │
│                    │
│ 👧 Sarah: 50%      │
│ 👦 Tom: 33%        │
│ 👩 Mom: 17%        │
│                    │
└────────────────────┘
```

---

## Conclusion

The Insights screen provides progressive, actionable data that adapts to available information, helping users understand both attendance patterns and spending across their family's classes. By offering both individual deep-dives and family-level comparisons through a simple dropdown selector, it serves multiple use cases while maintaining simplicity and clarity.
