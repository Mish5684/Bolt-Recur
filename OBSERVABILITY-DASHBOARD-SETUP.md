# Observability & Reporting Setup Guide

## Current State: What's Built In

✅ **Comprehensive Logging** - All agent decisions, notifications, and user activities are logged
✅ **Database Views** - Pre-built SQL views for common metrics
✅ **Query Library** - 12+ ready-to-use observability queries
✅ **Edge Function Logging** - Orchestrator returns execution summaries

❌ **Dashboard UI** - Not built (you need to create one or use existing tools)
❌ **Automated Reports** - Not configured (need to set up)
❌ **Alerts** - Not configured (need to set up)

---

## Option 1: Quick & Free - Supabase Dashboard (Recommended)

### Setup Time: 5 minutes

Supabase has a built-in dashboard you can use immediately.

**Step 1: Run Observability Queries**
1. Go to your Supabase project: https://zipaxzxolqypaugjvybh.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste `OBSERVABILITY-QUERIES.sql`
4. Run the entire script - it creates 12 views

**Step 2: View Reports**
Use these pre-built views in SQL Editor:

```sql
-- Quick Overview
SELECT * FROM system_health_check;

-- Agent Performance
SELECT * FROM agent_performance_summary;

-- Notification Delivery
SELECT * FROM notification_metrics;

-- Onboarding Funnel
SELECT * FROM onboarding_funnel;

-- Agent Effectiveness
SELECT * FROM agent_effectiveness;
```

**Step 3: Export Data**
```sql
-- Get JSON export for external tools
SELECT export_agent_metrics_json();
```

**Pros:**
- ✅ Free
- ✅ No setup required
- ✅ Direct access to data

**Cons:**
- ❌ Manual refresh required
- ❌ No visualizations
- ❌ No scheduled reports

---

## Option 2: Metabase (Free, Self-Hosted)

### Setup Time: 30 minutes

Metabase is a free, open-source BI tool with great visualizations.

**Step 1: Deploy Metabase**
```bash
# Using Docker
docker run -d -p 3000:3000 --name metabase metabase/metabase
```

Or use Metabase Cloud (free tier): https://www.metabase.com/start/

**Step 2: Connect to Supabase**
1. Open Metabase at http://localhost:3000
2. Add Database Connection:
   - Type: PostgreSQL
   - Host: `db.zipaxzxolqypaugjvybh.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: Your Supabase database password (from Settings > Database)

**Step 3: Create Dashboard**

Create cards for these queries:

**Card 1: Agent Performance**
```sql
SELECT * FROM agent_performance_summary;
```
Visualization: Table or Bar Chart

**Card 2: Notification Metrics**
```sql
SELECT * FROM notification_metrics;
```
Visualization: Table with conditional formatting

**Card 3: Daily Activity Timeline**
```sql
SELECT * FROM daily_agent_activity
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
```
Visualization: Line Chart (date on X-axis, notifications_sent on Y-axis, colored by agent_name)

**Card 4: Onboarding Funnel**
```sql
SELECT * FROM onboarding_funnel;
```
Visualization: Funnel Chart

**Card 5: System Health**
```sql
SELECT * FROM system_health_check;
```
Visualization: Scorecard

**Step 4: Schedule Reports**
- Metabase can email dashboard snapshots daily/weekly
- Go to Dashboard > Sharing > Email

**Pros:**
- ✅ Beautiful visualizations
- ✅ Scheduled email reports
- ✅ Shareable dashboards
- ✅ Free for unlimited users

**Cons:**
- ❌ Requires hosting (Docker or Metabase Cloud)
- ❌ Initial setup time

---

## Option 3: Google Sheets (Free, Simple)

### Setup Time: 15 minutes

Use Google Sheets with data imported from Supabase.

**Step 1: Install Supabase Extension**
Unfortunately, there's no direct Google Sheets extension. Use this workaround:

**Option A: Export via API**
Create a simple Supabase Edge Function that returns metrics as JSON:

```typescript
// supabase/functions/metrics-export/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: metrics } = await supabase.rpc('export_agent_metrics_json');

  return new Response(JSON.stringify(metrics), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Option B: Manual CSV Export**
1. Run query in Supabase SQL Editor
2. Click "Download as CSV"
3. Import to Google Sheets
4. Set up refresh schedule

**Pros:**
- ✅ Free
- ✅ Familiar interface
- ✅ Easy sharing

**Cons:**
- ❌ Manual data refresh
- ❌ Limited visualizations
- ❌ Not real-time

---

## Option 4: Grafana + PostgreSQL (Advanced)

### Setup Time: 2 hours

For production-grade monitoring with alerts.

**Step 1: Install Grafana**
```bash
docker run -d -p 3001:3000 --name grafana grafana/grafana
```

**Step 2: Add PostgreSQL Data Source**
- Connect to Supabase PostgreSQL
- Same credentials as Metabase option

**Step 3: Import Dashboard**
Create panels for each observability query.

**Step 4: Set Up Alerts**
Configure alerts for:
- Notification delivery failures
- High skip rates
- Low open rates

**Pros:**
- ✅ Production-grade monitoring
- ✅ Real-time updates
- ✅ Advanced alerting
- ✅ Beautiful visualizations

**Cons:**
- ❌ Complex setup
- ❌ Requires maintenance
- ❌ Steeper learning curve

---

## Option 5: Custom Admin Dashboard (Build Your Own)

### Setup Time: 4-8 hours

Build a custom admin dashboard in your Recur app.

**Tech Stack:**
- React Native Web (or separate web app)
- Supabase JS Client
- Chart library (e.g., recharts, victory-native)

**Example Components:**

```typescript
// AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../shared/api/supabase';

export function AgentPerformanceCard() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    async function fetchMetrics() {
      const { data } = await supabase
        .from('agent_performance_summary')
        .select('*');
      setMetrics(data);
    }
    fetchMetrics();
  }, []);

  return (
    <View>
      <Text>Agent Performance (Last 7 Days)</Text>
      {metrics.map(m => (
        <View key={m.agent_name}>
          <Text>{m.agent_name}: {m.notifications_sent} sent</Text>
        </View>
      ))}
    </View>
  );
}
```

**Pros:**
- ✅ Fully customized
- ✅ Integrated with your app
- ✅ Real-time data
- ✅ Mobile-friendly

**Cons:**
- ❌ Time-consuming to build
- ❌ Requires maintenance
- ❌ More code to manage

---

## Recommended Approach

### For MVP (Today):
1. **Run SQL queries manually** in Supabase SQL Editor
2. **Save common queries** as snippets
3. **Export CSV** for weekly reviews

### For Production (Within 1-2 Weeks):
1. **Set up Metabase** (30 min setup, free forever)
2. **Create dashboard** with 5-6 key charts
3. **Schedule weekly email reports** to stakeholders

### For Scale (Later):
1. **Build custom admin dashboard** in your app
2. **Add real-time alerts** via email/Slack
3. **Create user-facing analytics** (optional)

---

## Key Metrics to Track

### Daily/Hourly:
- ✅ Notifications sent
- ✅ Agent evaluations run
- ✅ System health status

### Weekly:
- 📊 Agent performance (send rates)
- 📊 Notification open rates
- 📊 User engagement (activity log)
- 📊 Onboarding funnel conversion

### Monthly:
- 📈 User growth
- 📈 Retention metrics
- 📈 Agent effectiveness (conversion rates)

---

## Alert Configuration (Recommended)

Set up alerts for:

1. **High Skip Rate** (>90% for any agent)
   - Indicates agent logic may need tuning

2. **Low Open Rate** (<10% for any notification type)
   - Indicates notification copy needs improvement

3. **No Notifications Sent** (24 hours with 0 sent)
   - Indicates edge function or cron failure

4. **High Frequency** (user receives >2 notifications/day)
   - Indicates frequency cap failure

---

## Sample Dashboard Layout

```
┌─────────────────────────────────────────────┐
│           SYSTEM HEALTH CHECK               │
│  Users: 1,234 | Push Tokens: 987           │
│  Notifications (24h): 45 | Classes: 567    │
└─────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────┐
│  AGENT           │  NOTIFICATION            │
│  PERFORMANCE     │  METRICS                 │
│  (Bar Chart)     │  (Table + Open Rates)    │
└──────────────────┴──────────────────────────┘

┌─────────────────────────────────────────────┐
│  DAILY ACTIVITY TIMELINE (Line Chart)       │
│  Shows notification trend over 30 days      │
└─────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────┐
│  ONBOARDING      │  AGENT EFFECTIVENESS     │
│  FUNNEL          │  (Conversion Rates)      │
│  (Funnel Chart)  │  (Bar Chart)             │
└──────────────────┴──────────────────────────┘
```

---

## Quick Start: View Your First Report Now

**Copy and run this in Supabase SQL Editor:**

```sql
-- Load all observability views
\i OBSERVABILITY-QUERIES.sql

-- View quick dashboard
SELECT * FROM system_health_check;
SELECT * FROM agent_performance_summary;
SELECT * FROM notification_metrics;
```

---

## Files Created

1. **OBSERVABILITY-QUERIES.sql** - All SQL queries and views
2. **This file** - Dashboard setup guide

---

## Next Steps

1. ✅ Run `OBSERVABILITY-QUERIES.sql` in Supabase
2. ✅ Verify views are created
3. ✅ Run sample queries to see data
4. 📊 Choose dashboard option (Metabase recommended)
5. 📧 Set up weekly email reports
6. 🔔 Configure alerts for critical metrics

---

**Questions?**
- How to access reports? → Run queries in Supabase SQL Editor
- How to visualize? → Use Metabase (Option 2)
- How to automate? → Schedule queries + email results
- How to alert? → Use Grafana (Option 4) or custom webhooks
