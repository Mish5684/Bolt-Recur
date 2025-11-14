/*
  # Enable Row Level Security and Policies

  ## Overview
  This migration enables Row Level Security (RLS) on all tables and creates policies
  to ensure users can only access their own data.

  ## Security Model
  
  1. RLS Enabled Tables
    - classes
    - family_members
    - payments
    - class_attendance
    - class_subscriptions
    
  2. Policy Strategy
    - SELECT: Users can only view their own data
    - INSERT: Users can only create data for themselves
    - UPDATE: Users can only update their own data
    - DELETE: Users can only delete their own data
    
  3. Data Access Rules
    - classes: Direct user_id check
    - family_members: Direct user_id check
    - payments: Through family_members ownership
    - class_attendance: Through family_members ownership
    - class_subscriptions: Through family_members ownership
    
  ## Important Security Notes
  - All policies use auth.uid() to get the current user
  - Policies are RESTRICTIVE by default
  - Users CANNOT access data belonging to other users
  - Unauthenticated users CANNOT access any data
*/

-- Enable RLS on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subscriptions ENABLE ROW LEVEL SECURITY;

-- Classes table policies
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

-- Family members table policies
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

-- Payments table policies (access through family_members ownership)
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

-- Class attendance table policies (access through family_members ownership)
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

-- Class subscriptions table policies (access through family_members ownership)
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