/*
  # Add user_id to Related Tables

  ## Overview
  This migration adds user_id columns to class_subscriptions, class_attendance, 
  and payments tables to enable proper data isolation and RLS enforcement.

  ## Changes Made

  1. **Add user_id columns**
     - Add user_id to class_subscriptions (derived from family_member)
     - Add user_id to class_attendance (derived from family_member)
     - Add user_id to payments (derived from family_member)

  2. **Populate existing data**
     - Backfill user_id values from related family_members records
     - Ensure all existing records have proper user_id values

  3. **Add constraints**
     - Make user_id NOT NULL after backfilling
     - Add foreign key constraints to auth.users
     - Add indexes for performance

  4. **Update RLS policies**
     - Add user_id-based policies to all three tables
     - Ensure proper data isolation

  ## Security Impact
  - Each user will only see their own subscriptions, attendance, and payments
  - RLS policies will automatically filter by user_id
  - Defense in depth with explicit user_id filtering in queries
*/

-- Step 1: Add user_id column to class_subscriptions (nullable initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_subscriptions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE class_subscriptions ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Step 2: Add user_id column to class_attendance (nullable initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_attendance' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE class_attendance ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Step 3: Add user_id column to payments (nullable initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Step 4: Backfill user_id in class_subscriptions from family_members
UPDATE class_subscriptions cs
SET user_id = fm.user_id
FROM family_members fm
WHERE cs.family_member_id = fm.id
  AND cs.user_id IS NULL;

-- Step 5: Backfill user_id in class_attendance from family_members
UPDATE class_attendance ca
SET user_id = fm.user_id
FROM family_members fm
WHERE ca.family_member_id = fm.id
  AND ca.user_id IS NULL;

-- Step 6: Backfill user_id in payments from family_members
UPDATE payments p
SET user_id = fm.user_id
FROM family_members fm
WHERE p.family_member_id = fm.id
  AND p.user_id IS NULL;

-- Step 7: Delete any orphaned records (where family_member no longer exists)
DELETE FROM class_subscriptions WHERE user_id IS NULL;
DELETE FROM class_attendance WHERE user_id IS NULL;
DELETE FROM payments WHERE user_id IS NULL;

-- Step 8: Make user_id NOT NULL
ALTER TABLE class_subscriptions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE class_attendance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;

-- Step 9: Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'class_subscriptions' AND constraint_name = 'class_subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE class_subscriptions
      ADD CONSTRAINT class_subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'class_attendance' AND constraint_name = 'class_attendance_user_id_fkey'
  ) THEN
    ALTER TABLE class_attendance
      ADD CONSTRAINT class_attendance_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payments' AND constraint_name = 'payments_user_id_fkey'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_subscriptions_user_id ON class_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_user_id ON class_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Step 11: Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON class_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON class_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON class_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON class_subscriptions;

DROP POLICY IF EXISTS "Users can view own attendance" ON class_attendance;
DROP POLICY IF EXISTS "Users can create own attendance" ON class_attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON class_attendance;
DROP POLICY IF EXISTS "Users can delete own attendance" ON class_attendance;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON payments;

-- Step 12: Create new RLS policies for class_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON class_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON class_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON class_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON class_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 13: Create new RLS policies for class_attendance
CREATE POLICY "Users can view own attendance"
  ON class_attendance
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attendance"
  ON class_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
  ON class_attendance
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attendance"
  ON class_attendance
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 14: Create new RLS policies for payments
CREATE POLICY "Users can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
