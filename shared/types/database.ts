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
}

export interface ClassAttendance {
  id: string;
  family_member_id: string;
  class_id: string;
  class_date: string;
  created_at: string;
}

export interface ClassSubscription {
  id: string;
  family_member_id: string;
  class_id: string;
  created_at: string;
}

export interface ClassWithDetails extends Class {}
