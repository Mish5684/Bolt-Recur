/*
  # Remove authentication requirement and enable public access

  1. Security Changes
    - Update all RLS policies to allow public access
    - Remove authentication requirement from all tables
    
  2. Tables Updated
    - family_members
    - payments  
    - class_attendance
    - classes
    - class_settings
*/

-- Update family_members policies
DROP POLICY IF EXISTS "Enable public access" ON family_members;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON family_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON family_members;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON family_members;

CREATE POLICY "Enable all access for everyone" ON family_members
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Update payments policies
DROP POLICY IF EXISTS "Enable public access" ON payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payments;

CREATE POLICY "Enable all access for everyone" ON payments
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Update class_attendance policies
DROP POLICY IF EXISTS "Enable public access" ON class_attendance;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON class_attendance;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON class_attendance;

CREATE POLICY "Enable all access for everyone" ON class_attendance
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Update classes policies
DROP POLICY IF EXISTS "Enable public access to classes" ON classes;

CREATE POLICY "Enable all access for everyone" ON classes
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Update class_settings policies
DROP POLICY IF EXISTS "Enable public access to class settings" ON class_settings;

CREATE POLICY "Enable all access for everyone" ON class_settings
  FOR ALL TO public USING (true) WITH CHECK (true);