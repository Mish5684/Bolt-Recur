/*
  # Make class_id nullable in family_members table

  1. Changes
    - Modify the `family_members` table to make `class_id` nullable
    - This allows members to be created without immediately being assigned to a class
    - Members will be associated with classes through attendance records instead
  
  2. Notes
    - Members can now exist without a class assignment
    - Class association happens when first attendance is recorded
*/

-- Make class_id nullable in family_members table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'class_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE family_members ALTER COLUMN class_id DROP NOT NULL;
  END IF;
END $$;
