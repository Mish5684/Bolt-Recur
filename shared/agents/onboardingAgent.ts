/**
 * Onboarding Agent
 *
 * Mission: Guide new users to 1-1-5 activation (1 family member, 1 class, 5 attendance)
 * Target: Users < 14 days since install who haven't reached 1-1-5
 * Execution Schedule: Day 3 and Day 7
 */

import {
  getUserOnboardingProgress,
  getAllClasses,
  getActiveClasses,
  hasRecentNotification,
  NotificationDecision,
} from '../utils/agentHelpers';
import { getDaysSince } from '../utils/scheduleUtils';

export async function evaluateOnboardingAgent(
  userId: string,
  evaluationTime: Date = new Date()
): Promise<NotificationDecision> {
  try {
    // Get onboarding progress
    const progress = await getUserOnboardingProgress(userId);

    // Skip if onboarding already completed
    if (progress.hasCompletedOnboarding) {
      return {
        action: 'skip',
        reason: 'Onboarding already completed'
      };
    }

    // Skip if user is > 14 days old
    if (progress.daysSinceInstall > 14) {
      return {
        action: 'skip',
        reason: 'User is past onboarding window (> 14 days)'
      };
    }

    // Check if user has reached 1-1-5 milestone
    const hasReached115 =
      progress.familyMembers >= 1 &&
      progress.classes >= 1 &&
      progress.attendanceRecords >= 5;

    if (hasReached115) {
      return {
        action: 'skip',
        reason: 'User has reached 1-1-5 milestone'
      };
    }

    // Determine which day trigger we're on
    const isDay3 = progress.daysSinceInstall === 3;
    const isDay7 = progress.daysSinceInstall === 7;

    if (!isDay3 && !isDay7) {
      return {
        action: 'skip',
        reason: `Not on trigger day (Day ${progress.daysSinceInstall})`
      };
    }

    // Check if we've already sent notification recently (within 3 days)
    const hasRecent = await hasRecentNotification(userId, 'onboarding', 3);
    if (hasRecent) {
      return {
        action: 'skip',
        reason: 'Already sent onboarding notification in last 3 days'
      };
    }

    // Get all classes (including paused) and active classes
    const allClasses = await getAllClasses(userId);
    const activeClasses = await getActiveClasses(userId);

    // Determine what the user needs to do next
    let message: NotificationDecision['message'];
    let deepLink: string;
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (progress.familyMembers === 0) {
      // No family members yet - highest priority
      message = {
        title: "Let's get started!",
        body: "Add your first family member to begin tracking classes."
      };
      deepLink = 'recur://add-family-member';
      priority = 'high';
    } else if (allClasses.length === 0) {
      // Has family member but no classes
      message = {
        title: "Add your first class",
        body: "Tell us about a class you're taking to start tracking attendance."
      };
      deepLink = 'recur://add-class';
      priority = 'high';
    } else if (activeClasses.length === 0) {
      // Has classes but all paused - encourage resuming
      message = {
        title: "Resume tracking",
        body: "Resume a class to continue tracking your progress."
      };
      deepLink = 'recur://home';
      priority = 'medium';
    } else if (progress.attendanceRecords === 0) {
      // Has active class but no attendance yet
      const firstClass = activeClasses[0];
      message = {
        title: "Mark your first attendance",
        body: `Did you attend ${firstClass.name} recently? Mark it now!`
      };
      deepLink = `recur://class/${firstClass.id}`;
      priority = 'high';
    } else if (progress.attendanceRecords < 5) {
      // Has some attendance but not 5 yet
      const remaining = 5 - progress.attendanceRecords;
      message = {
        title: "You're making progress!",
        body: `Mark ${remaining} more ${remaining === 1 ? 'class' : 'classes'} to complete your setup.`
      };
      deepLink = 'recur://home';
      priority = 'medium';
    } else {
      // Should not reach here, but just in case
      return {
        action: 'skip',
        reason: 'User has completed all onboarding steps'
      };
    }

    return {
      action: 'send_notification',
      reason: isDay3 ? 'Day 3 onboarding nudge' : 'Day 7 onboarding nudge',
      message,
      deepLink,
      priority,
      metadata: {
        family_members: progress.familyMembers,
        classes: allClasses.length,
        active_classes: activeClasses.length,
        attendance_records: progress.attendanceRecords,
        days_since_install: progress.daysSinceInstall
      }
    };
  } catch (error) {
    console.error('Error in onboarding agent:', error);
    return {
      action: 'skip',
      reason: 'Error evaluating user'
    };
  }
}
