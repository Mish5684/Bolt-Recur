/**
 * Engage Agent
 *
 * Mission: Post-class attendance reminders and weekly engagement summary
 * Target: Users with active scheduled classes
 * Execution Schedule: 2 hours after scheduled class time + Sunday 6 PM (weekly summary)
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.38.4';
import {
  getActiveClasses,
  getLastNotificationForAgent,
  NotificationDecision,
} from '../utils/agentHelpers.ts';
import {
  getHoursUntil,
  isScheduledToday,
  getDaysSince,
} from '../utils/scheduleUtils.ts';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'npm:date-fns@3.3.1';

export async function evaluateEngageAgent(
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

    const currentHour = evaluationTime.getHours();
    const currentDay = evaluationTime.getDay(); // 0 = Sunday

    // PRIORITY 1: Post-class attendance reminder (2 hours after scheduled time)
    for (const classItem of classes) {
      const hasSchedule = classItem.schedule && classItem.schedule.length > 0;
      if (!hasSchedule) continue;

      // Check if class was scheduled today
      const wasScheduledToday = isScheduledToday(classItem.schedule, evaluationTime);
      if (!wasScheduledToday) continue;

      // Get the scheduled time for today
      const scheduledTimes = classItem.schedule.filter(
        (item: any) => item.day === ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDay]
      );

      if (scheduledTimes.length === 0) continue;

      // Check each scheduled time for today
      for (const scheduleItem of scheduledTimes) {
        const [hourStr, minuteStr] = scheduleItem.time.split(':');
        const scheduledHour = parseInt(hourStr, 10);
        const scheduledMinute = parseInt(minuteStr, 10);

        // Calculate scheduled time as Date
        const scheduledTime = new Date(evaluationTime);
        scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);

        const hoursAfterClass = getHoursUntil(scheduledTime, evaluationTime);

        // Check if it's been 2-3 hours after class
        if (hoursAfterClass >= 2 && hoursAfterClass < 3) {
          // Check if attendance was already marked for today
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('class_attendance')
            .select('id')
            .eq('class_id', classItem.id)
            .eq('class_date', evaluationTime.toISOString().split('T')[0])
            .limit(1);

          if (attendanceError) {
            console.error('Error checking attendance:', attendanceError);
            continue;
          }

          // If attendance already marked, skip
          if (attendanceData && attendanceData.length > 0) {
            continue;
          }

          // Check if we've already sent reminder today
          const lastNotification = await getLastNotificationForAgent(
            supabase,
            userId,
            'post_class_reminder',
            classItem.id
          );

          if (lastNotification) {
            const hoursSinceLastNotif = getHoursUntil(
              new Date(lastNotification.sent_at),
              evaluationTime
            );
            if (hoursSinceLastNotif < 24) {
              continue; // Already sent today
            }
          }

          // Send post-class reminder
          return {
            action: 'send_notification',
            reason: `Post-class reminder for ${classItem.name}`,
            message: {
              title: `Did you attend ${classItem.name}?`,
              body: "Don't forget to mark your attendance for today's session!"
            },
            deepLink: `recur://class/${classItem.id}`,
            priority: 'medium',
            metadata: {
              class_id: classItem.id,
              class_name: classItem.name,
              notification_type: 'post_class_reminder',
              scheduled_time: scheduledTime.toISOString()
            }
          };
        }
      }
    }

    // PRIORITY 2: Weekly summary (Sunday 6 PM)
    if (currentDay === 0 && currentHour === 18) {
      // Check if we've already sent weekly summary this week
      const lastNotification = await getLastNotificationForAgent(
        supabase,
        userId,
        'weekly_summary'
      );

      if (lastNotification) {
        const daysSinceLastNotif = getDaysSince(lastNotification.sent_at);
        if (daysSinceLastNotif < 7) {
          return {
            action: 'skip',
            reason: 'Weekly summary already sent this week'
          };
        }
      }

      // Calculate weekly and monthly attendance stats
      const weekStart = startOfWeek(evaluationTime);
      const weekEnd = endOfWeek(evaluationTime);
      const monthStart = startOfMonth(evaluationTime);
      const monthEnd = endOfMonth(evaluationTime);

      // Get attendance for this week (active classes only)
      const { data: weeklyAttendance, error: weeklyError } = await supabase
        .from('class_attendance')
        .select('id, class_id')
        .gte('class_date', weekStart.toISOString().split('T')[0])
        .lte('class_date', weekEnd.toISOString().split('T')[0])
        .in('class_id', classes.map(c => c.id));

      if (weeklyError) {
        console.error('Error getting weekly attendance:', weeklyError);
        return { action: 'skip', reason: 'Error calculating weekly stats' };
      }

      // Get attendance for this month (active classes only)
      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('class_attendance')
        .select('id')
        .gte('class_date', monthStart.toISOString().split('T')[0])
        .lte('class_date', monthEnd.toISOString().split('T')[0])
        .in('class_id', classes.map(c => c.id));

      if (monthlyError) {
        console.error('Error getting monthly attendance:', monthlyError);
        return { action: 'skip', reason: 'Error calculating monthly stats' };
      }

      const weeklyCount = weeklyAttendance?.length || 0;
      const monthlyCount = monthlyAttendance?.length || 0;

      // Only send if user attended at least 1 class this week
      if (weeklyCount === 0) {
        return {
          action: 'skip',
          reason: 'No classes attended this week'
        };
      }

      return {
        action: 'send_notification',
        reason: 'Weekly engagement summary',
        message: {
          title: "Your week in classes",
          body: `You attended ${weeklyCount} ${weeklyCount === 1 ? 'class' : 'classes'} this week. Total this month: ${monthlyCount}.`
        },
        deepLink: 'recur://analytics',
        priority: 'low',
        metadata: {
          notification_type: 'weekly_summary',
          classes_this_week: weeklyCount,
          classes_this_month: monthlyCount
        }
      };
    }

    return { action: 'skip', reason: 'No engagement actions needed' };
  } catch (error) {
    console.error('Error in engage agent:', error);
    return {
      action: 'skip',
      reason: 'Error evaluating user'
    };
  }
}
