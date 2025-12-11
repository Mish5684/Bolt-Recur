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
    const currentHour = evaluationTime.getHours();

    // Determine generation time: evening (8 PM) or morning (8 AM)
    const generationTime = currentHour >= 19 && currentHour < 23 ? 'evening' : 'morning';

    console.log(`[Orchestrator] Starting ${generationTime} generation at ${evaluationTime.toISOString()}`);

    // Cleanup stale notifications from previous cycle
    const cleanupGenerationTime = generationTime === 'evening' ? 'evening' : 'evening';
    const { data: cleanupResult } = await supabase.rpc('cleanup_stale_notifications', {
      p_generation_time: cleanupGenerationTime,
      p_hours_threshold: 24
    });
    console.log(`[Orchestrator] Cleaned up ${cleanupResult || 0} stale notifications`);

    // Get all users
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    console.log(`[Orchestrator] Evaluating ${usersData.users.length} users`);

    let notificationsCreated = 0;
    let usersProcessed = 0;
    const results: any[] = [];

    // Process each user
    for (const user of usersData.users) {
      try {
        usersProcessed++;

        // Determine which agents to run based on generation time
        let agents;
        if (generationTime === 'evening') {
          // Evening: Only Alert Agent for early morning classes
          agents = [
            { name: 'alert', priority: 1, evaluate: evaluateAlertAgent },
          ];
        } else {
          // Morning: All agents
          agents = [
            { name: 'alert', priority: 1, evaluate: evaluateAlertAgent },
            { name: 'engage', priority: 2, evaluate: evaluateEngageAgent },
            { name: 'gather_more_info', priority: 3, evaluate: evaluateGatherMoreInfoAgent },
            { name: 'onboarding', priority: 4, evaluate: evaluateOnboardingAgent },
            { name: 'never_tried', priority: 5, evaluate: evaluateNeverTriedAgent },
          ];
        }

        // Evaluate each agent and create in-app notifications
        for (const agent of agents) {
          try {
            // Call the agent evaluation function
            let decision;
            if (agent.name === 'onboarding' || agent.name === 'never_tried') {
              decision = await agent.evaluate(supabase, user.id, user.created_at, evaluationTime);
            } else {
              decision = await agent.evaluate(supabase, user.id, evaluationTime);
            }

            // Log decision for ALL users
            await supabase.from('agent_decision_log').insert({
              user_id: user.id,
              agent_name: agent.name,
              decision: decision.action,
              reason: decision.reason || null,
              metadata: decision.metadata || {}
            });

            console.log(`[Orchestrator] Agent ${agent.name} decision for user ${user.id}: ${decision.action} - ${decision.reason || 'no reason'}`);

            if (decision.action === 'send_notification' && decision.message) {
              // Create in-app notification
              const { error: insertError } = await supabase
                .from('in_app_notifications')
                .insert({
                  user_id: user.id,
                  agent_name: agent.name,
                  notification_type: decision.metadata?.notification_type || agent.name,
                  title: decision.message.title,
                  body: decision.message.body,
                  deep_link: decision.deepLink || null,
                  priority: decision.priority || 'medium',
                  metadata: decision.metadata || {},
                  generation_time: generationTime
                });

              if (insertError) {
                console.error(`[Orchestrator] Failed to create in-app notification:`, insertError);
                results.push({
                  userId: user.id,
                  agent: agent.name,
                  status: 'failed',
                  error: insertError.message
                });
              } else {
                notificationsCreated++;
                console.log(`[Orchestrator] Created in-app notification for user ${user.id} from ${agent.name}`);
                results.push({
                  userId: user.id,
                  agent: agent.name,
                  status: 'created',
                  title: decision.message.title
                });
              }
            }
          } catch (agentError) {
            console.error(`[Orchestrator] Error evaluating ${agent.name} for user ${user.id}:`, agentError);
          }
        }
      } catch (userError) {
        console.error(`[Orchestrator] Error processing user ${user.id}:`, userError);
      }
    }

    // Send daily summary push notifications
    let pushNotificationsSent = 0;
    const pushType = generationTime === 'evening' ? 'evening_summary' : 'morning_summary';

    for (const user of usersData.users) {
      try {
        // Check if we already sent this push today
        const { data: alreadySent } = await supabase.rpc('was_daily_push_sent', {
          p_user_id: user.id,
          p_push_type: pushType
        });

        if (alreadySent) {
          console.log(`[Orchestrator] ${pushType} already sent to user ${user.id} today`);
          continue;
        }

        // Get actionable notification count
        const { data: notificationCount } = await supabase.rpc('get_actionable_notification_count', {
          p_user_id: user.id
        });

        if (!notificationCount || notificationCount === 0) {
          console.log(`[Orchestrator] User ${user.id} has no actionable notifications, skipping push`);
          continue;
        }

        // Get user's push token
        const { data: pushTokenData } = await supabase
          .from('user_push_tokens')
          .select('expo_push_token')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!pushTokenData?.expo_push_token) {
          console.log(`[Orchestrator] User ${user.id} has no active push token`);
          continue;
        }

        // Prepare summary message
        let title, body;
        if (generationTime === 'evening') {
          title = notificationCount === 1 ? 'Class reminder for tomorrow' : `${notificationCount} updates for tomorrow`;
          body = notificationCount === 1 ? 'You have a class coming up tomorrow morning' : `You have ${notificationCount} notifications waiting`;
        } else {
          title = 'Good morning!';
          body = notificationCount === 1 ? 'You have 1 update in Recur today' : `You have ${notificationCount} updates in Recur today`;
        }

        // Send push notification
        const notification: NotificationPayload = {
          to: pushTokenData.expo_push_token,
          title,
          body,
          sound: 'default',
          data: {
            deepLink: 'notifications',
            notificationCount
          },
          priority: 'default'
        };

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
          // Log the push
          await supabase.from('notification_push_log').insert({
            user_id: user.id,
            push_type: pushType,
            notification_count: notificationCount
          });

          pushNotificationsSent++;
          console.log(`[Orchestrator] Sent ${pushType} push to user ${user.id}`);
        } else {
          console.error(`[Orchestrator] Failed to send push notification:`, expoPushResult);
        }
      } catch (pushError) {
        console.error(`[Orchestrator] Error sending push to user ${user.id}:`, pushError);
      }
    }

    const summary = {
      generationTime,
      evaluationTime: evaluationTime.toISOString(),
      usersProcessed,
      notificationsCreated,
      pushNotificationsSent,
      results
    };

    console.log(`[Orchestrator] Completed ${generationTime} generation. Processed ${usersProcessed} users, created ${notificationsCreated} notifications, sent ${pushNotificationsSent} push notifications`);

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