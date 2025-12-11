export interface LocationData {
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  pincode?: string;
  city?: string;
  country?: string;
  place_id?: string;
}

export interface Class {
  id: string;
  name: string;
  type?: string;
  instructor?: string;
  schedule?: ScheduleItem[];
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  pincode?: string;
  city?: string;
  country?: string;
  place_id?: string;
  status: 'active' | 'paused';
  paused_at?: string;
  paused_reason?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ScheduleItem {
  day: string;
  time: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  relation: string;
  class_id?: string;
  created_at: string;
  user_id: string;
}

export interface Payment {
  id: string;
  family_member_id: string;
  class_id: string;
  classes_paid: number;
  amount: number;
  currency: string;
  payment_date: string;
  created_at: string;
  user_id: string;
}

export interface ClassAttendance {
  id: string;
  family_member_id: string;
  class_id: string;
  class_date: string;
  created_at: string;
  user_id: string;
}

export interface ClassSubscription {
  id: string;
  family_member_id: string;
  class_id: string;
  created_at: string;
  user_id: string;
}

export interface ClassWithDetails extends Class {}

export interface InAppNotification {
  id: string;
  user_id: string;
  agent_name: 'alert' | 'engage' | 'onboarding' | 'gather_more_info' | 'never_tried';
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

export interface NotificationPushLog {
  id: string;
  user_id: string;
  push_type: 'evening_summary' | 'morning_summary';
  sent_at: string;
  notification_count: number;
}
