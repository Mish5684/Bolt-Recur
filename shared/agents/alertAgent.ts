/**
 * Alert Agent
 *
 * Mission: Alert users about low prepaid balance and upcoming scheduled classes
 * Target: All users with active classes that have payment records AND/OR schedules
 * Execution Schedule: Runs hourly to check for upcoming classes; low balance checked daily at 9 AM
 */

import {
  getActiveClasses,
  getPrepaidBalance,
  getPaymentCount,
  getLastNotificationForAgent,
  NotificationDecision,
} from '../utils/agentHelpers';
import {
  getNextScheduledTime,
  getHoursUntil,
  formatTime,
  getDaysSince,
} from '../utils/scheduleUtils';

export async function evaluateAlertAgent(
  userId: string,
  evaluationTime: Date = new Date()
): Promise<NotificationDecision> {
  try {
    // Fetch ONLY ACTIVE classes
    const classes = await getActiveClasses(userId);

    if (!classes || classes.length === 0) {
      return { action: 'skip', reason: 'No active classes' };
    }

    const alerts: NotificationDecision[] = [];

    // PRIORITY 1: Pre-class reminders (2 hours before scheduled class)
    // Handles DnD rules: Classes before 10 AM get alert at 9 PM prior day
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
          // It's 9 PM the day before an early class
          shouldSendAlert = true;
        }
      } else {
        // Classes at 10 AM or later: Send alert 2 hours before
        if (hoursUntilClass >= 2 && hoursUntilClass < 3) {
          shouldSendAlert = true;
        }
      }

      if (shouldSendAlert) {
        // Check if already notified in last 24 hours
        const lastNotification = await getLastNotificationForAgent(
          userId,
          'pre_class_alert',
          classItem.id
        );

        if (lastNotification) {
          const hoursSinceLastNotif = getHoursUntil(
            new Date(lastNotification.sent_at),
            evaluationTime
          );
          if (hoursSinceLastNotif < 24) {
            continue; // Skip, already notified recently
          }
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
            alert_type: 'pre_class_reminder'
          }
        });
      }
    }

    // PRIORITY 2: Low balance alerts (only for classes with payment records)
    // Run daily at 9 AM
    const currentHour = evaluationTime.getHours();

    if (currentHour === 9) {
      for (const classItem of classes) {
        const paymentCount = await getPaymentCount(classItem.id);

        // Only alert if class has payment records (user is tracking payments)
        if (paymentCount === 0) continue;

        // Get the first subscription for this class to find family member
        // Note: A class can have multiple family members, but we'll use the first one for balance calc
        const balance = await getPrepaidBalance(userId, classItem.id);

        // Low balance definition: < 3 classes remaining
        if (balance.remaining < 3 && balance.remaining >= 0) {
          const lastAlert = await getLastNotificationForAgent(
            userId,
            'low_balance_alert',
            classItem.id
          );

          // Send once when hitting threshold, don't repeat
          if (!lastAlert) {
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
                alert_type: 'low_balance'
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
