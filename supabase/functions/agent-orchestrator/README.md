# Agent Orchestrator Edge Function

## Overview
This Edge Function coordinates all marketing agents and sends push notifications to users based on agent decisions.

## Deployment

### 1. Deploy the Edge Function
```bash
# NOTE: The agent evaluation logic needs to be bundled with this function
# Since Supabase Edge Functions run in Deno and can't access the mobile app's shared folder,
# you'll need to either:
# A) Copy agent logic into this function (inline)
# B) Create a separate package/module that both mobile app and edge function can import
# C) Use Supabase's upcoming module system when available

# For now, we recommend Option A for simplicity
# Deploy using Supabase CLI:
npx supabase functions deploy agent-orchestrator
```

### 2. Set up Cron Job
You need to configure a cron job to run this function hourly.

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Database > Extensions
3. Enable `pg_cron` extension
4. Go to SQL Editor and run:

```sql
-- Schedule agent orchestrator to run every hour
SELECT cron.schedule(
  'agent-orchestrator-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://zipaxzxolqypaugjvybh.supabase.co/functions/v1/agent-orchestrator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

#### Option B: Using External Cron Service
Use a service like cron-job.org, EasyCron, or GitHub Actions to call the edge function hourly.

Example GitHub Actions workflow:
```yaml
name: Agent Orchestrator
on:
  schedule:
    - cron: '0 * * * *' # Every hour

jobs:
  run-agents:
    runs-on: ubuntu-latest
    steps:
      - name: Call Agent Orchestrator
        run: |
          curl -X POST \
            https://zipaxzxolqypaugjvybh.supabase.co/functions/v1/agent-orchestrator \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

### 3. Monitor Execution
Check logs in Supabase Dashboard > Edge Functions > agent-orchestrator > Logs

## Architecture

### Agent Priority Order
1. **Alert Agent** (Priority 1) - Pre-class reminders + low balance
2. **Engage Agent** (Priority 2) - Post-class reminders + weekly summary
3. **Gather More Info** (Priority 3) - Schedule + payment nudges
4. **Onboarding Agent** (Priority 4) - New user guidance (1-1-5)
5. **Never Tried Agent** (Priority 5) - Dormant user reactivation

### Rules
- **Max 1 notification per user per day** (frequency cap)
- **Quiet hours**: No notifications 10 PM - 8 AM (user's local timezone)
- **First match wins**: Once an agent decides to send, stop evaluating
- **Pause-aware**: All agents filter for `status = 'active'` classes

## TODO: Production Deployment

⚠️ **IMPORTANT**: This Edge Function currently has placeholder imports. Before deploying:

1. **Bundle Agent Logic**: Copy all agent evaluation functions from `shared/agents/` into this Edge Function
2. **Bundle Helper Functions**: Copy helper functions from `shared/utils/agentHelpers.ts` and `shared/utils/scheduleUtils.ts`
3. **Test Locally**: Use `npx supabase functions serve` to test locally
4. **Deploy**: Use `npx supabase functions deploy agent-orchestrator`
5. **Configure Cron**: Set up hourly execution
6. **Monitor**: Check logs for errors

## Testing

### Test Manually
```bash
# Call the function directly
curl -X POST \
  https://zipaxzxolqypaugjvybh.supabase.co/functions/v1/agent-orchestrator \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "evaluationTime": "2025-11-28T12:00:00.000Z",
  "usersProcessed": 150,
  "notificationsSent": 23,
  "results": [
    {
      "userId": "uuid",
      "agent": "alert",
      "status": "sent",
      "title": "Low balance: Yoga"
    }
  ]
}
```

## Troubleshooting

### No Notifications Sent
- Check if users have active push tokens in `user_push_tokens` table
- Verify quiet hours haven't blocked notifications
- Check frequency cap (max 1/day per user)
- Review `agent_decision_log` table for agent decisions

### Push Notifications Fail
- Verify Expo push tokens are valid
- Check Expo Push API response in logs
- Ensure tokens are in correct format: `ExponentPushToken[...]`

### Agents Not Evaluating
- Check that agent evaluation logic is properly bundled
- Review function logs for import errors
- Verify database functions exist (`get_prepaid_balance`, etc.)
