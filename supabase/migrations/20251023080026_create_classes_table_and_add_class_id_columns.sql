/*
  # Create classes table and add class_id to related tables

  ## Overview
  This migration creates the missing `classes` table and adds `class_id` foreign key columns
  to existing tables to support multiple yoga classes.

  ## Changes

  1. New Tables
    - `classes`
      - `id` (uuid, primary key) - Unique identifier for each class
      - `name` (text, not null) - Name of the yoga class
      - `created_at` (timestamptz) - When the class was created
      - `updated_at` (timestamptz) - When the class was last updated

  2. Modified Tables
    - `family_members`
      - Add `class_id` (uuid, foreign key) - Links member to a specific class
    - `payments`
      - Add `class_id` (uuid, foreign key) - Links payment to a specific class
    - `class_attendance`
      - Add `class_id` (uuid, foreign key) - Links attendance to a specific class

  3. Security
    - Enable RLS on `classes` table
    - Add policies for authenticated users to manage their classes
    - Note: Current implementation allows all authenticated users to access all data
      (suitable for single-user or trusted multi-user scenarios)

  4. Data Migration
    - Migrate existing data from `class_settings` to `classes` if records exist
    - Set a default class for existing family_members, payments, and attendance records
*/

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on classes table
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Users can view all classes"
  ON classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete classes"
  ON classes FOR DELETE
  TO authenticated
  USING (true);

-- Migrate data from class_settings to classes if any exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM class_settings LIMIT 1) THEN
    INSERT INTO classes (id, name, created_at, updated_at)
    SELECT id, name, created_at, updated_at
    FROM class_settings
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Add class_id column to family_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE family_members ADD COLUMN class_id uuid;
  END IF;
END $$;

-- Add class_id column to payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN class_id uuid;
  END IF;
END $$;

-- Add class_id column to class_attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_attendance' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE class_attendance ADD COLUMN class_id uuid;
  END IF;
END $$;

-- Set default class_id for existing records
DO $$
DECLARE
  default_class_id uuid;
BEGIN
  -- Get or create a default class
  SELECT id INTO default_class_id FROM classes LIMIT 1;
  
  IF default_class_id IS NULL THEN
    INSERT INTO classes (name) VALUES ('Default Class') RETURNING id INTO default_class_id;
  END IF;
  
  -- Update existing records with the default class_id
  UPDATE family_members SET class_id = default_class_id WHERE class_id IS NULL;
  UPDATE payments SET class_id = default_class_id WHERE class_id IS NULL;
  UPDATE class_attendance SET class_id = default_class_id WHERE class_id IS NULL;
END $$;

-- Add foreign key constraints
ALTER TABLE family_members 
  DROP CONSTRAINT IF EXISTS family_members_class_id_fkey;

ALTER TABLE family_members 
  ADD CONSTRAINT family_members_class_id_fkey 
  FOREIGN KEY (class_id) 
  REFERENCES classes(id) 
  ON DELETE CASCADE;

ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_class_id_fkey;

ALTER TABLE payments 
  ADD CONSTRAINT payments_class_id_fkey 
  FOREIGN KEY (class_id) 
  REFERENCES classes(id) 
  ON DELETE CASCADE;

ALTER TABLE class_attendance 
  DROP CONSTRAINT IF EXISTS class_attendance_class_id_fkey;

ALTER TABLE class_attendance 
  ADD CONSTRAINT class_attendance_class_id_fkey 
  FOREIGN KEY (class_id) 
  REFERENCES classes(id) 
  ON DELETE CASCADE;

-- Make class_id NOT NULL after setting defaults
ALTER TABLE family_members ALTER COLUMN class_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN class_id SET NOT NULL;
ALTER TABLE class_attendance ALTER COLUMN class_id SET NOT NULL;
