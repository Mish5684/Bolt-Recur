---
title: Insights Screen - Product Requirements Document
version: 1.0.0
date: 2025-12-12
status: Draft
---

# Insights Screen - Product Requirements Document

## Overview
The Insights screen provides focused, actionable data about attendance trends and spending overview across family members. It features a simplified design with two core sections and elegant data-entry nudges, offering both individual and family-level views through a dropdown selector.

---

## Core Jobs To Be Done

### JTBD 1: Help me see attendance trends at a glance
**User Need:** "Show me attendance patterns over time - who's attending regularly?"

**Value:**
- View 6-month attendance trends for quick pattern recognition
- Compare family members' attendance side-by-side
- Quick access to add missing attendance records

### JTBD 2: Help me track spending across my family
**User Need:** "Where is my money going each month?"

**Value:**
- Track monthly and yearly spending at a glance
- See spending distribution across family members
- Quick access to record missing payments for complete tracking

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
│  ┌───────────────────────────────────┐ │
│  │  Add Any Missing Payment Records  │ │
│  │  for Complete Spend Analysis      │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Data Displayed:**
- **This Month:** Sum of payments made this month
- **This Year:** Sum of payments made this calendar year
- **Spending Trend:** Bar chart of monthly spending (last 6 months)
- **Add Missing Payments Button:** Navigates to individual's detail page for complete spend tracking

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
```

**Navigation:**
- "Add Any Missing Payment Records" button navigates to the individual's detail page
- This provides a streamlined path to complete payment tracking for comprehensive spend analysis

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
│  ┌───────────────────────────────────┐ │
│  │ 👧 Sarah                          │ │
│  │ $1,200 (50%)                      │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━       │ │
│  │                                   │ │
│  │ [+ Add missing payments]          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👦 Tom                            │ │
│  │ $800 (33%)                        │ │
│  │ ━━━━━━━━━━━━━━━━               │ │
│  │                                   │ │
│  │ [+ Add missing payments]          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👩 Mom                            │ │
│  │ $400 (17%)                        │ │
│  │ ━━━━━━━━                        │ │
│  │                                   │ │
│  │ [+ Add missing payments]          │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Key Insight:** Family view shows TOTALS for spending (unlike attendance which shows comparison)

**Data Displayed:**
- Total family spending this month
- Total family spending this year
- Per-member spending breakdown with percentages
- Visual bars showing relative distribution
- Compact "Add missing payments" link button for each member
- Sorted by spending amount (highest first)

**Button Design:**
- Styled as a subtle text link with "+" icon prefix
- Appears below each member's spending bar in a light gray color
- Tapping navigates to that member's detail page for payment entry
- Minimal visual weight to avoid cluttering the overview

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

**Navigation:**
- Each "Add missing payments" link navigates to that specific family member's detail page
- This provides quick access to record payments for any family member from the spending overview

---

## Progressive Data Enhancement

### Scenario Matrix

| Has Attendance | Has Payments | What Shows |
|---------------|--------------|------------|
| ✅ | ❌ | Attendance trends, "Add Missing Payments" button |
| ❌ | ✅ | Spending overview, "Add Missing Attendance" button |
| ✅ | ✅ | Full insights: attendance trends + spending overview |
| ❌ | ❌ | Empty state with prompts to add data |

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
├─────────────────────────────────────────┤
│  SPENDING INSIGHTS                      │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │This Month  │  │This Year   │        │
│  │  $1,200    │  │  $12,000   │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  Monthly Spending (Last 6 Months)       │
│  ┌───────────────────────────────────┐ │
│  │      ▂▄▆▅█▇                       │ │
│  │  Jul Aug Sep Oct Nov Dec          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Add Any Missing Payment Records  │ │
│  │  for Complete Spend Analysis      │ │
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
│  │ 👧 Sarah                          │ │
│  │ $1,200 (50%)                      │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━       │ │
│  │                                   │ │
│  │ [+ Add missing payments]          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👦 Tom                            │ │
│  │ $800 (33%)                        │ │
│  │ ━━━━━━━━━━━━━━━━               │ │
│  │                                   │ │
│  │ [+ Add missing payments]          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👩 Mom                            │ │
│  │ $400 (17%)                        │ │
│  │ ━━━━━━━━                        │ │
│  │                                   │ │
│  │ [+ Add missing payments]          │ │
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

// Family View: Render spending by member with payment buttons
function renderFamilySpendingView(
  familyMembers: FamilyMember[],
  allPayments: Payment[],
  navigation: any
): JSX.Element {
  const familyThisMonth = allPayments
    .filter(p => isSameMonth(new Date(p.payment_date), new Date()))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <View>
      {familyMembers.map(member => {
        const memberPayments = allPayments
          .filter(p => p.family_member_id === member.id)
          .filter(p => isSameMonth(new Date(p.payment_date), new Date()));

        const total = memberPayments.reduce((sum, p) => sum + p.amount, 0);
        const percentage = familyThisMonth > 0 ? (total / familyThisMonth) * 100 : 0;

        return (
          <View key={member.id} style={styles.memberSpendingCard}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.amount}>${total} ({percentage.toFixed(0)}%)</Text>

            <View style={styles.progressBar}>
              <View style={[styles.progress, { width: `${percentage}%` }]} />
            </View>

            <TouchableOpacity
              style={styles.addPaymentLink}
              onPress={() => navigation.navigate('FamilyMemberDetail', {
                familyMemberId: member.id
              })}
            >
              <Text style={styles.linkText}>+ Add missing payments</Text>
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
- [ ] `calculateSpendingMetrics()` with various payment data
- [ ] `filterByMember()` for individual vs family view
- [ ] `renderFamilyAttendanceView()` with multiple members
- [ ] `renderFamilySpendingView()` with payment distribution

### Integration Tests

- [ ] Member selection updates both attendance and spending sections
- [ ] Data refresh recomputes all metrics correctly
- [ ] Empty states show appropriate nudges for missing data
- [ ] Family view renders attendance trend chart for each member
- [ ] Family view renders spending bars with payment buttons for each member
- [ ] "Add missing attendance" button navigates to correct member's detail page
- [ ] "Add missing payments" link navigates to correct member's detail page
- [ ] Individual view displays "Add Any Missing Payment Records" button
- [ ] Empty state for individual members shows correctly in family view

### E2E Tests

- [ ] Load insights → See family view with attendance trends and spending for all members
- [ ] Open dropdown → See member options ("All Family" and individual members)
- [ ] Select member → See individual view with attendance trend and spending overview
- [ ] Tap "Add Missing Attendance" button → Navigate to member's detail page
- [ ] Tap "Add Any Missing Payment Records" button → Navigate to member's detail page
- [ ] Tap "+ Add missing payments" link in family view → Navigate to correct member's detail page
- [ ] Tap "Mark Attendance" in empty state → Navigate to member's detail page
- [ ] Refresh data → All metrics update correctly
- [ ] Navigate back → Selection persists

---

## Success Metrics

### Engagement

- **Insights View Rate:** % of users who view insights tab (target: 60%+)
- **Member Selection Rate:** % who filter by individual member (target: 40%+)
- **Session Time:** Avg time spent on insights (target: 45+ seconds)

### Actionability

- **"Add Missing Attendance" Button Usage:** % who tap to add attendance (target: 30%+)
- **"Add Missing Payments" Button/Link Usage:** % who tap to record payments (target: 25%+)
- **Empty State CTA Usage:** % who tap "Mark Attendance" from empty state (target: 40%+)
- **Data Completion Rate:** % of users who add missing data after viewing insights (target: 35%+)

### Data Quality

- **Attendance Data Coverage:** % of active classes with regular attendance tracking
- **Payment Data Coverage:** % of active classes with payment data

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
| 2025-12-12 | 1.5 | Simplified screen structure: Removed sections B (Per-Class Breakdown), C (At-Risk Classes), E (Spending by Class), and F (Value Analysis); Removed cost/class widget from Section D; Added "Add Any Missing Payment Records" button in Individual View; Added elegant "Add missing payments" link for each member in Family View spending section | - |

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
│ SPENDING ▼         │
│ ┌────────┐         │
│ │ $1,200 │         │
│ │  This  │         │
│ │  Month │         │
│ └────────┘         │
│                    │
│ [Spending Chart]   │
│ (Last 6 Months)    │
│                    │
│ [Add Missing       │
│  Payment Records]  │
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
│ SPENDING ▼         │
│ Total: $2,400      │
│                    │
│ ┌──────────────┐   │
│ │ 👧 Sarah     │   │
│ │ $1,200 (50%) │   │
│ │ ━━━━━━━━━━  │   │
│ │ + Add missing│   │
│ │   payments   │   │
│ └──────────────┘   │
│                    │
│ ┌──────────────┐   │
│ │ 👦 Tom       │   │
│ │ $800 (33%)   │   │
│ │ ━━━━━━━     │   │
│ │ + Add missing│   │
│ │   payments   │   │
│ └──────────────┘   │
│                    │
│ ┌──────────────┐   │
│ │ 👩 Mom       │   │
│ │ $400 (17%)   │   │
│ │ ━━━━        │   │
│ │ + Add missing│   │
│ │   payments   │   │
│ └──────────────┘   │
│                    │
└────────────────────┘
```

---

## Conclusion

The Insights screen provides focused, actionable data about attendance and spending. The simplified design emphasizes two key metrics (attendance trends and spending overview) with direct paths to add missing data through elegant, contextual buttons. By offering both individual and family-level views through a simple dropdown selector, it serves multiple use cases while maintaining clarity and avoiding information overload.
