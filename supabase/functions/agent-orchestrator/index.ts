import { createClient } from 'npm:@supabase/supabase-js@2.38.4';
import { evaluateAlertAgent } from './agents/alertAgent.ts';
import { evaluateEngageAgent } from './agents/engageAgent.ts';
import { evaluateGatherMoreInfoAgent } from './agents/gatherMoreInfoAgent.ts';
import { evaluateOnboardingAgent } from './agents/onboardingAgent.ts';
import { evaluateNeverTriedAgent } from './agents/neverTriedAgent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

Deno.serve(async (req: Request) => {
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
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    console.log(`[Orchestrator] Evaluating ${usersData.users.length} users`);

    let notificationsSent = 0;
    let usersProcessed = 0;
    const results: any[] = [];

    // Process each user
    for (const user of usersData.users) {
      try {
        usersProcessed++;

        // Get user timezone for quiet hours check
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('timezone')
          .eq('user_id', user.id)
          .maybeSingle();

        const timezone = prefsData?.timezone || 'UTC';

        // Check quiet hours (10 PM - 8 AM)
        const userLocalTime = new Date(evaluationTime.toLocaleString('en-US', { timeZone: timezone }));
        const userLocalHour = userLocalTime.getHours();

        if (userLocalHour >= 22 || userLocalHour < 8) {
          console.log(`[Orchestrator] User ${user.id} in quiet hours (${userLocalHour}:00 ${timezone})`);
          continue;
        }

        // Evaluate agents in priority order
        const agents = [
          { name: 'alert', priority: 1, evaluate: evaluateAlertAgent },
          { name: 'engage', priority: 2, evaluate: evaluateEngageAgent },
          { name: 'gather_more_info', priority: 3, evaluate: evaluateGatherMoreInfoAgent },
          { name: 'onboarding', priority: 4, evaluate: evaluateOnboardingAgent },
          { name: 'never_tried', priority: 5, evaluate: evaluateNeverTriedAgent },
        ];

        let notificationSent = false;

        for (const agent of agents) {
          try {
            // Call the agent evaluation function with appropriate parameters
            let decision;
            if (agent.name === 'onboarding' || agent.name === 'never_tried') {
              // These agents need user created_at date
              decision = await agent.evaluate(supabase, user.id, user.created_at, evaluationTime);
            } else {
              decision = await agent.evaluate(supabase, user.id, evaluationTime);
            }

            // Log decision for ALL users (even without push tokens)
            await supabase.from('agent_decision_log').insert({
              user_id: user.id,
              agent_name: agent.name,
              decision: decision.action,
              reason: decision.reason || null,
              metadata: decision.metadata || {}
            });

            console.log(`[Orchestrator] Agent ${agent.name} decision for user ${user.id}: ${decision.action} - ${decision.reason || 'no reason'}`);

            if (decision.action === 'send_notification' && decision.message) {
              // Check if user has push token ONLY when we need to send
              const { data: pushTokenData } = await supabase
                .from('user_push_tokens')
                .select('expo_push_token')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

              if (!pushTokenData?.expo_push_token) {
                console.log(`[Orchestrator] Decision made but user ${user.id} has no active push token - skipping notification`);
                results.push({
                  userId: user.id,
                  agent: agent.name,
                  status: 'no_push_token',
                  decision: decision.action,
                  reason: decision.reason,
                  title: decision.message.title
                });
                break; // Agent made a decision, stop evaluating other agents
              }

              // Check frequency cap (max 2 per day)
              const { data: notificationCountData } = await supabase.rpc('get_notification_count_today', {
                p_user_id: user.id
              });

              const notificationsToday = notificationCountData || 0;
              if (notificationsToday >= 2) {
                console.log(`[Orchestrator] Decision made but user ${user.id} already received ${notificationsToday} notifications today`);
                results.push({
                  userId: user.id,
                  agent: agent.name,
                  status: 'frequency_capped',
                  decision: decision.action,
                  reason: decision.reason,
                  title: decision.message.title
                });
                break; // Agent made a decision, stop evaluating other agents
              }

              // Prepare Expo push notification
              const notification: NotificationPayload = {
                to: pushTokenData.expo_push_token,
                title: decision.message.title,
                body: decision.message.body,
                sound: 'default',
                data: {
                  deepLink: decision.deepLink,
                  agentName: agent.name,
                  ...decision.metadata
                },
                priority: decision.priority === 'high' ? 'high' : 'default'
              };

              // Send notification via Expo Push API
              const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify(notification)
              });

              const expoPushResult = await expoPushResponse.json();

              if (expoPushResponse.ok && expoPushResult.data) {
                // Record notification in history
                await supabase.from('notification_history').insert({
                  user_id: user.id,
                  agent_name: agent.name,
                  notification_type: decision.metadata?.notification_type || agent.name,
                  title: decision.message.title,
                  body: decision.message.body,
                  deep_link: decision.deepLink || null,
                  metadata: decision.metadata || {}
                });

                notificationsSent++;
                notificationSent = true;
                console.log(`[Orchestrator] Sent notification for user ${user.id} from ${agent.name}`);

                results.push({
                  userId: user.id,
                  agent: agent.name,
                  status: 'sent',
                  title: decision.message.title
                });

                break; // First match wins, stop evaluating other agents
              } else {
                console.error(`[Orchestrator] Failed to send push notification:`, expoPushResult);
                results.push({
                  userId: user.id,
                  agent: agent.name,
                  status: 'failed',
                  error: expoPushResult.errors || 'Unknown error'
                });
              }
            }
          } catch (agentError) {
            console.error(`[Orchestrator] Error evaluating ${agent.name} for user ${user.id}:`, agentError);
          }
        }

        if (!notificationSent) {
          console.log(`[Orchestrator] No notification sent for user ${user.id} (all agents returned skip or no push token)`);
        }
      } catch (userError) {
        console.error(`[Orchestrator] Error processing user ${user.id}:`, userError);
      }
    }

    const summary = {
      evaluationTime: evaluationTime.toISOString(),
      usersProcessed,
      notificationsSent,
      results
    };

    console.log(`[Orchestrator] Completed. Processed ${usersProcessed} users, sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify(summary),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});