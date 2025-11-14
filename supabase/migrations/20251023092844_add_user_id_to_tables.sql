/*
  # Add User Authentication Support

  ## Overview
  This migration adds user_id columns to all tables to support multi-user authentication.
  Each user will only be able to see and manage their own data.

  ## Changes
  
  1. Tables Modified
    - `classes`: Add user_id column with foreign key to auth.users
    - `family_members`: Add user_id column with foreign key to auth.users
    
  2. Foreign Key Constraints
    - All user_id columns reference auth.users(id) with CASCADE delete
    - When a user is deleted, all their data is automatically removed
    
  3. Important Notes
    - Existing data will have NULL user_id (to be handled separately if needed)
    - New records MUST include user_id
    - RLS policies will be added in the next migration
*/

-- Add user_id to classes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE classes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
  END IF;
END $$;

-- Add user_id to family_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE family_members ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
  END IF;
END $$;