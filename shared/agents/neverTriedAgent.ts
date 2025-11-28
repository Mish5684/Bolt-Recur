/**
 * Never Tried Agent
 *
 * Mission: Reactivate users who installed but never added a family member
 * Target: Users with zero family members
 * Execution Schedule: Day 7, Day 30, Day 60 (then stop)
 */

import { supabase } from '../api/supabase';
import {
  hasRecentNotification,
  NotificationDecision,
} from '../utils/agentHelpers';

export async function evaluateNeverTriedAgent(
  userId: string,
  evaluationTime: Date = new Date()
): Promise<NotificationDecision> {
  try {
    // Get user created_at (install date)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { action: 'skip', reason: 'User not found' };
    }

    const installDate = new Date(user.created_at);
    const daysSinceInstall = Math.floor(
      (evaluationTime.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if user has any family members
    const { count, error: countError } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error checking family members:', countError);
      return { action: 'skip', reason: 'Error checking family members' };
    }

    // If user has family members, they've "tried" the app
    if ((count || 0) > 0) {
      return {
        action: 'skip',
        reason: 'User has already added family members'
      };
    }

    // Check trigger days: Day 7, 30, 60
    const isTriggerDay = daysSinceInstall === 7 || daysSinceInstall === 30 || daysSinceInstall === 60;

    if (!isTriggerDay) {
      return {
        action: 'skip',
        reason: `Not on trigger day (Day ${daysSinceInstall})`
      };
    }

    // Don't send after Day 60
    if (daysSinceInstall > 60) {
      return {
        action: 'skip',
        reason: 'User is past dormant reactivation window (> 60 days)'
      };
    }

    // Check if we've already sent notification recently (within 7 days)
    const hasRecent = await hasRecentNotification(userId, 'never_tried', 7);
    if (hasRecent) {
      return {
        action: 'skip',
        reason: 'Already sent never_tried notification in last 7 days'
      };
    }

    // Determine message based on how long it's been
    let message: NotificationDecision['message'];
    let priority: 'low' | 'medium' | 'high';

    if (daysSinceInstall === 7) {
      message = {
        title: "Ready to start tracking?",
        body: "Add your first family member and start organizing your classes."
      };
      priority = 'medium';
    } else if (daysSinceInstall === 30) {
      message = {
        title: "We're here when you're ready",
        body: "Keep all your recurring classes organized in one place. Get started in seconds!"
      };
      priority = 'low';
    } else {
      // Day 60
      message = {
        title: "Miss tracking your classes?",
        body: "Recur helps you stay on top of attendance and expenses. Give it a try!"
      };
      priority = 'low';
    }

    return {
      action: 'send_notification',
      reason: `Day ${daysSinceInstall} dormant user reactivation`,
      message,
      deepLink: 'recur://add-family-member',
      priority,
      metadata: {
        days_since_install: daysSinceInstall,
        family_members: 0,
        trigger_type: 'dormant_reactivation'
      }
    };
  } catch (error) {
    console.error('Error in never tried agent:', error);
    return {
      action: 'skip',
      reason: 'Error evaluating user'
    };
  }
}
