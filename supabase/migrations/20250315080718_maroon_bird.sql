/*
  # Remove authentication requirement

  1. Security Changes
    - Update RLS policies to allow public access to all tables
    - Remove authentication requirement from existing policies
    
  2. Changes
    - Modify family_members table policies
    - Modify payments table policies
    - Modify class_attendance table policies
*/

-- Update family_members policies
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON family_members;
CREATE POLICY "Enable public access" ON family_members
  FOR ALL USING (true);

-- Update payments policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payments;
CREATE POLICY "Enable public access" ON payments
  FOR ALL USING (true);

-- Update class_attendance policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON class_attendance;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON class_attendance;
CREATE POLICY "Enable public access" ON class_attendance
  FOR ALL USING (true);