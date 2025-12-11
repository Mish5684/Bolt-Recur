import { supabase } from '../api/supabase';

export interface InAppNotification {
  id: string;
  user_id: string;
  agent_name: string;
  notification_type: string;
  title: string;
  body: string;
  deep_link: string | null;
  priority: 'high' | 'medium' | 'low';
  metadata: Record<string, any>;
  generation_time: 'evening' | 'morning';
  created_at: string;
  read_at: string | null;
  action_completed_at: string | null;
  dismissed_at: string | null;
}

export async function validateNotificationAction(
  notification: InAppNotification
): Promise<boolean> {
  const { notification_type, metadata } = notification;

  try {
    switch (notification_type) {
      case 'pre_class_reminder':
        return await validateAttendanceRecorded(metadata);

      case 'post_class_reminder':
        return await validateAttendanceRecorded(metadata);

      case 'low_balance':
        return await validatePaymentAdded(
          notification.user_id,
          metadata.class_id,
          notification.created_at
        );

      case 'add_schedule':
        return await validateScheduleConfigured(
          notification.user_id,
          metadata.class_id
        );

      case 'add_payment_tracking':
        return await validatePaymentAdded(
          notification.user_id,
          metadata.class_id,
          notification.created_at
        );

      case 'onboarding_milestone':
        return await validateOnboardingProgress(
          notification.user_id,
          metadata
        );

      case 'dormant_reactivation':
        return await validateFamilyMemberAdded(notification.user_id);

      case 'weekly_summary':
        return false;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error validating notification action:', error);
    return false;
  }
}

async function validateAttendanceRecorded(
  metadata: Record<string, any>
): Promise<boolean> {
  const { class_id, attendance_date } = metadata;

  if (!class_id || !attendance_date) {
    return false;
  }

  const { data, error } = await supabase
    .from('class_attendance')
    .select('id')
    .eq('class_id', class_id)
    .eq('attendance_date', attendance_date)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking attendance:', error);
    return false;
  }

  return !!data;
}

async function validatePaymentAdded(
  userId: string,
  classId: string,
  notificationCreatedAt: string
): Promise<boolean> {
  if (!classId) {
    return false;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id')
    .eq('user_id', userId)
    .eq('class_id', classId)
    .gt('created_at', notificationCreatedAt)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking payments:', error);
    return false;
  }

  return !!data;
}

async function validateScheduleConfigured(
  userId: string,
  classId: string
): Promise<boolean> {
  if (!classId) {
    return false;
  }

  const { data, error } = await supabase
    .from('classes')
    .select('schedule')
    .eq('id', classId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking schedule:', error);
    return false;
  }

  return data?.schedule && Array.isArray(data.schedule) && data.schedule.length > 0;
}

async function validateOnboardingProgress(
  userId: string,
  metadata: Record<string, any>
): Promise<boolean> {
  const { data: familyCount } = await supabase
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: classCount } = await supabase
    .from('classes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: attendanceCount } = await supabase
    .from('class_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const hasProgress =
    (familyCount?.length || 0) > (metadata.family_members || 0) ||
    (classCount?.length || 0) > (metadata.classes || 0) ||
    (attendanceCount?.length || 0) > (metadata.attendance_records || 0);

  return hasProgress;
}

async function validateFamilyMemberAdded(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking family members:', error);
    return false;
  }

  return !!data;
}

export async function validateAndUpdateNotifications(
  notifications: InAppNotification[]
): Promise<InAppNotification[]> {
  const updatedNotifications: InAppNotification[] = [];

  for (const notification of notifications) {
    if (notification.action_completed_at) {
      updatedNotifications.push(notification);
      continue;
    }

    const isCompleted = await validateNotificationAction(notification);

    if (isCompleted && !notification.action_completed_at) {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ action_completed_at: new Date().toISOString() })
        .eq('id', notification.id);

      if (!error) {
        notification.action_completed_at = new Date().toISOString();
      }
    }

    updatedNotifications.push(notification);
  }

  return updatedNotifications;
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  await supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function dismissNotification(
  notificationId: string
): Promise<void> {
  await supabase
    .from('in_app_notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('in_app_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .is('action_completed_at', null)
    .is('dismissed_at', null);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

export async function getActionableCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('in_app_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('action_completed_at', null)
    .is('dismissed_at', null);

  if (error) {
    console.error('Error getting actionable count:', error);
    return 0;
  }

  return count || 0;
}
