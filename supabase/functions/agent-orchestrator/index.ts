import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

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

        // Check if user has push token
        const { data: pushTokenData } = await supabase
          .from('user_push_tokens')
          .select('expo_push_token')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!pushTokenData?.expo_push_token) {
          console.log(`[Orchestrator] User ${user.id} has no active push token`);
          continue;
        }

        // Check frequency cap (max 1 per day)
        const { data: notificationCountData } = await supabase.rpc('get_notification_count_today', {
          p_user_id: user.id
        });

        const notificationsToday = notificationCountData || 0;
        if (notificationsToday >= 1) {
          console.log(`[Orchestrator] User ${user.id} already received notification today`);
          continue;
        }

        // Get user timezone
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('timezone')
          .eq('user_id', user.id)
          .single();

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
          { name: 'alert', priority: 1, module: './agents/alertAgent.ts' },
          { name: 'engage', priority: 2, module: './agents/engageAgent.ts' },
          { name: 'gather_more_info', priority: 3, module: './agents/gatherMoreInfoAgent.ts' },
          { name: 'onboarding', priority: 4, module: './agents/onboardingAgent.ts' },
          { name: 'never_tried', priority: 5, module: './agents/neverTriedAgent.ts' },
        ];

        let notificationSent = false;

        for (const agent of agents) {
          try {
            // Dynamically import agent module
            const agentModule = await import(agent.module);
            const evaluateFunction = agentModule[`evaluate${agent.name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Agent`];

            if (!evaluateFunction) {
              console.error(`[Orchestrator] Agent ${agent.name} has no evaluate function`);
              continue;
            }

            const decision = await evaluateFunction(user.id, evaluationTime);

            // Log decision
            await supabase.from('agent_decision_log').insert({
              user_id: user.id,
              agent_name: agent.name,
              decision: decision.action,
              reason: decision.reason || null,
              metadata: decision.metadata || {}
            });

            if (decision.action === 'send_notification' && decision.message) {
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
          console.log(`[Orchestrator] No notification sent for user ${user.id}`);
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
