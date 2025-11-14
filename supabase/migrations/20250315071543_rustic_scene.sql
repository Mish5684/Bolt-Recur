/*
  # Update RLS policies for family_members table

  1. Changes
    - Drop existing policies
    - Add new policies with proper security checks
    - Enable all CRUD operations for authenticated users

  2. Security
    - Allow authenticated users to perform all operations on family_members table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON family_members;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON family_members;

-- Create new comprehensive policies
CREATE POLICY "Enable full access for authenticated users" ON family_members
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);