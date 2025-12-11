/**
 * Alert Agent
 *
 * Mission: Alert users about low prepaid balance and upcoming scheduled classes
 * Target: All users with active classes that have payment records AND/OR schedules
 * Execution Schedule: Runs hourly to check for upcoming classes; low balance checked daily at 9 AM
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.38.4';
import {
  getActiveClasses,
  getPrepaidBalance,
  getPaymentCount,
  hasActiveInAppNotification,
  NotificationDecision,
} from '../utils/agentHelpers.ts';
import {
  getNextScheduledTime,
  getHoursUntil,
  formatTime,
} from '../utils/scheduleUtils.ts';

export async function evaluateAlertAgent(
  supabase: SupabaseClient,
  userId: string,
  evaluationTime: Date = new Date()
): Promise<NotificationDecision> {
  try {
    // Fetch ONLY ACTIVE classes
    const classes = await getActiveClasses(supabase, userId);

    if (!classes || classes.length === 0) {
      return { action: 'skip', reason: 'No active classes' };
    }

    const alerts: NotificationDecision[] = [];

    // PRIORITY 1: Pre-class reminders (2 hours before scheduled class)
    for (const classItem of classes) {
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
          shouldSendAlert = true;
        }
      } else {
        // Classes at 10 AM or later: Send alert 2 hours before
        if (hoursUntilClass >= 2 && hoursUntilClass < 3) {
          shouldSendAlert = true;
        }
      }

      if (shouldSendAlert) {
        // Check if active notification already exists
        const hasActiveNotification = await hasActiveInAppNotification(
          supabase,
          userId,
          'pre_class_reminder',
          classItem.id
        );

        if (hasActiveNotification) {
          continue; // Skip, active notification already exists
        }

        const timeDisplay = formatTime(nextScheduledTime);

        alerts.push({
          action: 'send_notification',
          message: {
            title: `${classItem.name} ${classHour < 10 ? 'tomorrow' : 'today'}`,
            body: `Your class is at ${timeDisplay}. Don't forget to attend!`
          },
          deepLink: `recur://class/${classItem.id}`,
          priority: 'high',
          metadata: {
            class_id: classItem.id,
            scheduled_time: nextScheduledTime.toISOString(),
            notification_type: 'pre_class_reminder'
          }
        });
      }
    }

    // PRIORITY 2: Low balance alerts (only for classes with payment records)
    const currentHour = evaluationTime.getHours();

    if (currentHour === 9) {
      for (const classItem of classes) {
        const paymentCount = await getPaymentCount(supabase, classItem.id);

        // Only alert if class has payment records
        if (paymentCount === 0) continue;

        const balance = await getPrepaidBalance(supabase, userId, classItem.id);

        // Low balance definition: < 3 classes remaining
        if (balance.remaining < 3 && balance.remaining >= 0) {
          // Check if active notification already exists
          const hasActiveNotification = await hasActiveInAppNotification(
            supabase,
            userId,
            'low_balance',
            classItem.id
          );

          // Send once when hitting threshold, don't repeat if active notification exists
          if (!hasActiveNotification) {
            alerts.push({
              action: 'send_notification',
              message: {
                title: `Low balance: ${classItem.name}`,
                body: `Only ${balance.remaining} prepaid ${balance.remaining === 1 ? 'class' : 'classes'} left. Record your next payment?`
              },
              deepLink: `recur://class/${classItem.id}/record-payment`,
              priority: 'high',
              metadata: {
                class_id: classItem.id,
                balance_remaining: balance.remaining,
                notification_type: 'low_balance'
              }
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
  } catch (error) {
    console.error('Error in alert agent:', error);
    return {
      action: 'skip',
      reason: 'Error evaluating user'
    };
  }
}
