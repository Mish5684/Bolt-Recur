/**
 * Agent Helper Functions
 * Utility functions used by marketing agents for calculations and checks
 */

import { supabase } from '../api/supabase';

export interface PrepaidBalance {
  classesPaid: number;
  classesAttended: number;
  remaining: number;
}

export interface NotificationDecision {
  action: 'send_notification' | 'skip';
  reason?: string;
  message?: {
    title: string;
    body: string;
  };
  deepLink?: string;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

/**
 * Get prepaid balance for a family member's class
 * Uses the database function created in migration
 */
export async function getPrepaidBalance(
  familyMemberId: string,
  classId: string
): Promise<PrepaidBalance> {
  try {
    const { data, error } = await supabase.rpc('get_prepaid_balance', {
      p_family_member_id: familyMemberId,
      p_class_id: classId
    });

    if (error) {
      console.error('Error getting prepaid balance:', error);
      return { classesPaid: 0, classesAttended: 0, remaining: 0 };
    }

    if (!data || data.length === 0) {
      return { classesPaid: 0, classesAttended: 0, remaining: 0 };
    }

    const result = data[0];
    return {
      classesPaid: result.classes_paid || 0,
      classesAttended: result.classes_attended || 0,
      remaining: result.balance || 0
    };
  } catch (error) {
    console.error('Exception getting prepaid balance:', error);
    return { classesPaid: 0, classesAttended: 0, remaining: 0 };
  }
}

/**
 * Get payment count for a class
 */
export async function getPaymentCount(classId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (error) {
      console.error('Error getting payment count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Exception getting payment count:', error);
    return 0;
  }
}

/**
 * Get notification count for today
 */
export async function getNotificationCountToday(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_notification_count_today', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Exception getting notification count:', error);
    return 0;
  }
}

/**
 * Check if user has received notification from specific agent recently
 */
export async function hasRecentNotification(
  userId: string,
  agentName: string,
  days: number = 1
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_recent_notification', {
      p_user_id: userId,
      p_agent_name: agentName,
      p_days: days
    });

    if (error) {
      console.error('Error checking recent notification:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Exception checking recent notification:', error);
    return false;
  }
}

/**
 * Get last notification for specific agent and optional class
 */
export async function getLastNotificationForAgent(
  userId: string,
  agentName: string,
  classId?: string
): Promise<any | null> {
  try {
    let query = supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_name', agentName)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (classId) {
      query = query.contains('metadata', { class_id: classId });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting last notification:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Exception getting last notification:', error);
    return null;
  }
}

/**
 * Get user's timezone
 */
export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('timezone')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return 'UTC'; // Default
    }

    return data.timezone || 'UTC';
  } catch (error) {
    console.error('Exception getting user timezone:', error);
    return 'UTC';
  }
}

/**
 * Get user onboarding progress
 */
export async function getUserOnboardingProgress(userId: string): Promise<{
  familyMembers: number;
  classes: number;
  attendanceRecords: number;
  hasCompletedOnboarding: boolean;
  daysSinceInstall: number;
}> {
  try {
    // Get user created_at (install date)
    const { data: userData } = await supabase.auth.getUser();
    const installDate = userData?.user?.created_at ? new Date(userData.user.created_at) : new Date();
    const daysSinceInstall = Math.floor(
      (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get family members count
    const { count: familyCount } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get classes count (all classes, including paused)
    const { count: classesCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get attendance records count
    const { data: attendanceData } = await supabase
      .from('class_attendance')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    // Check if onboarding completed
    const { data: prefsData } = await supabase
      .from('user_preferences')
      .select('onboarding_completed_at')
      .eq('user_id', userId)
      .single();

    const hasCompletedOnboarding = !!prefsData?.onboarding_completed_at;

    return {
      familyMembers: familyCount || 0,
      classes: classesCount || 0,
      attendanceRecords: attendanceData?.length || 0,
      hasCompletedOnboarding,
      daysSinceInstall
    };
  } catch (error) {
    console.error('Exception getting onboarding progress:', error);
    return {
      familyMembers: 0,
      classes: 0,
      attendanceRecords: 0,
      hasCompletedOnboarding: false,
      daysSinceInstall: 0
    };
  }
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Exception marking onboarding completed:', error);
  }
}

/**
 * Log agent decision
 */
export async function logAgentDecision(
  userId: string,
  agentName: string,
  decision: 'send_notification' | 'skip',
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('agent_decision_log').insert({
      user_id: userId,
      agent_name: agentName,
      decision,
      reason: reason || null,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Exception logging agent decision:', error);
  }
}

/**
 * Track user activity
 */
export async function trackActivity(
  userId: string,
  eventType: string,
  eventData?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('user_activity_log').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData || {}
    });
  } catch (error) {
    console.error('Exception tracking activity:', error);
  }
}

/**
 * Record notification sent
 */
export async function recordNotificationSent(
  userId: string,
  agentName: string,
  notificationType: string,
  title: string,
  body: string,
  deepLink?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('notification_history').insert({
      user_id: userId,
      agent_name: agentName,
      notification_type: notificationType,
      title,
      body,
      deep_link: deepLink || null,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Exception recording notification:', error);
  }
}

/**
 * Get active classes for user (excludes paused)
 */
export async function getActiveClasses(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Error getting active classes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting active classes:', error);
    return [];
  }
}

/**
 * Get all classes for user (includes paused)
 */
export async function getAllClasses(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting all classes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting all classes:', error);
    return [];
  }
}
