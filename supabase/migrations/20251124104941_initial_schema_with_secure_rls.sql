/*
  # Recur - Complete Database Schema with Secure Row Level Security

  ## Overview
  This migration creates the complete schema for the Recur class tracking app
  with proper user-based Row Level Security from the start.

  ## Tables Created
  
  1. **family_members** - Stores family members who attend classes
     - id, name, avatar, relation, class_id (nullable), user_id, created_at
     
  2. **classes** - Stores class information
     - id, name, type, instructor, schedule (jsonb), location fields, user_id, created_at, updated_at
     
  3. **payments** - Tracks payments made for classes
     - id, family_member_id, class_id, classes_paid, amount, currency, payment_date, created_at
     
  4. **class_attendance** - Records when family members attend classes
     - id, family_member_id, class_id, class_date, created_at
     
  5. **class_subscriptions** - Manages which family members are subscribed to which classes
     - id, family_member_id, class_id, created_at
     - Unique constraint on (family_member_id, class_id)

  ## Security Model
  
  All tables use Row Level Security (RLS) with user isolation:
  - classes & family_members: Direct user_id check (auth.uid() = user_id)
  - payments, attendance, subscriptions: Checked through family_members ownership
  - Only authenticated users can access data
  - Users can ONLY see and manage their own data
  
  ## Important Notes
  - All user_id columns are required (NOT NULL)
  - RLS is RESTRICTIVE by default - tables are locked until proper user_id is provided
  - Data is completely isolated between users
*/

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text DEFAULT '👤',
  relation text DEFAULT 'Self',
  class_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  instructor text,
  schedule jsonb DEFAULT '[]'::jsonb,
  location_name text,
  address text,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  pincode text,
  city text,
  country text,
  place_id text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  classes_paid integer NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  payment_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create class_attendance table
CREATE TABLE IF NOT EXISTS class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create class_subscriptions table
CREATE TABLE IF NOT EXISTS class_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_member_id, class_id)
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_pincode ON classes(pincode);
CREATE INDEX IF NOT EXISTS idx_classes_city ON classes(city);
CREATE INDEX IF NOT EXISTS idx_classes_coordinates ON classes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_payments_family_member_id ON payments(family_member_id);
CREATE INDEX IF NOT EXISTS idx_payments_class_id ON payments(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_family_member_id ON class_attendance(family_member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON class_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_family_member_id ON class_subscriptions(family_member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_class_id ON class_subscriptions(class_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CLASSES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own classes"
  ON classes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own classes"
  ON classes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- FAMILY MEMBERS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own family members"
  ON family_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- Access controlled through family_members ownership
-- =====================================================

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = payments.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = payments.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = payments.family_member_id
      AND family_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = payments.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = payments.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- CLASS ATTENDANCE TABLE POLICIES
-- Access controlled through family_members ownership
-- =====================================================

CREATE POLICY "Users can view own attendance"
  ON class_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_attendance.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own attendance"
  ON class_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_attendance.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own attendance"
  ON class_attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_attendance.family_member_id
      AND family_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_attendance.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own attendance"
  ON class_attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_attendance.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- CLASS SUBSCRIPTIONS TABLE POLICIES
-- Access controlled through family_members ownership
-- =====================================================

CREATE POLICY "Users can view own subscriptions"
  ON class_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_subscriptions.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own subscriptions"
  ON class_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_subscriptions.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own subscriptions"
  ON class_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_subscriptions.family_member_id
      AND family_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_subscriptions.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own subscriptions"
  ON class_subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = class_subscriptions.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );