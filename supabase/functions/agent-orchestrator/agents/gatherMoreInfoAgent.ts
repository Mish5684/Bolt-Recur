/**
 * Gather More Info Agent
 *
 * Mission: Nudge users to add schedule and payment tracking for incomplete classes
 * Target: Users with active classes < 30 days old missing schedule or payment records
 * Execution Schedule: Every 10 days
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.38.4';
import {
  getActiveClasses,
  getPaymentCount,
  getLastNotificationForAgent,
  NotificationDecision,
} from '../utils/agentHelpers.ts';
import { getDaysSince, isValidSchedule } from '../utils/scheduleUtils.ts';

export async function evaluateGatherMoreInfoAgent(
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

    // Filter classes < 30 days old
    const recentClasses = classes.filter(classItem => {
      const daysSinceCreated = getDaysSince(classItem.created_at);
      return daysSinceCreated <= 30;
    });

    if (recentClasses.length === 0) {
      return {
        action: 'skip',
        reason: 'No recent classes (all > 30 days old)'
      };
    }

    // Check each class for missing schedule or payment records
    const classesNeedingSchedule: any[] = [];
    const classesNeedingPayment: any[] = [];

    for (const classItem of recentClasses) {
      // Check for schedule
      const hasValidSchedule =
        classItem.schedule &&
        Array.isArray(classItem.schedule) &&
        classItem.schedule.length > 0 &&
        isValidSchedule(classItem.schedule);

      if (!hasValidSchedule) {
        classesNeedingSchedule.push(classItem);
      }

      // Check for payment records
      const paymentCount = await getPaymentCount(supabase, classItem.id);
      if (paymentCount === 0) {
        classesNeedingPayment.push(classItem);
      }
    }

    // Priority: Schedule first, then payment tracking
    let targetClass: any | null = null;
    let nudgeType: 'schedule' | 'payment' | null = null;

    if (classesNeedingSchedule.length > 0) {
      targetClass = classesNeedingSchedule[0]; // Pick first one
      nudgeType = 'schedule';
    } else if (classesNeedingPayment.length > 0) {
      targetClass = classesNeedingPayment[0]; // Pick first one
      nudgeType = 'payment';
    }

    if (!targetClass || !nudgeType) {
      return {
        action: 'skip',
        reason: 'All recent classes have schedule and payment tracking'
      };
    }

    // Check if we've already sent notification for this class recently (within 10 days)
    const lastNotification = await getLastNotificationForAgent(
      supabase,
      userId,
      'gather_more_info',
      targetClass.id
    );

    if (lastNotification) {
      const daysSinceLastNotif = getDaysSince(lastNotification.sent_at);
      if (daysSinceLastNotif < 10) {
        return {
          action: 'skip',
          reason: `Already sent gather_more_info notification for ${targetClass.name} ${daysSinceLastNotif} days ago`
        };
      }
    }

    // Prepare notification based on nudge type
    let message: NotificationDecision['message'];
    let deepLink: string;

    if (nudgeType === 'schedule') {
      message = {
        title: `Add schedule for ${targetClass.name}`,
        body: "Know when classes happen? Add a schedule to get helpful reminders."
      };
      deepLink = `recur://class/${targetClass.id}/edit`;
    } else {
      // nudgeType === 'payment'
      message = {
        title: `Track spending for ${targetClass.name}`,
        body: "Record your payments to see cost per class and prepaid balance."
      };
      deepLink = `recur://class/${targetClass.id}/record-payment`;
    }

    return {
      action: 'send_notification',
      reason: `Nudge to add ${nudgeType} for ${targetClass.name}`,
      message,
      deepLink,
      priority: 'medium',
      metadata: {
        notification_type: nudgeType === 'schedule' ? 'add_schedule' : 'add_payment_tracking',
        class_id: targetClass.id,
        class_name: targetClass.name,
        nudge_type: nudgeType,
        days_since_created: getDaysSince(targetClass.created_at)
      }
    };
  } catch (error) {
    console.error('Error in gather more info agent:', error);
    return {
      action: 'skip',
      reason: 'Error evaluating user'
    };
  }
}
