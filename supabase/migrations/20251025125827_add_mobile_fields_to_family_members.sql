/*
  # Add mobile app fields to family_members table

  1. Changes
    - Add `avatar` column (text) to store emoji avatars
    - Add `relation` column (text) to store relationship (Self, Daughter, Son, etc.)
    - Both fields are optional for backward compatibility

  2. Security
    - No RLS changes needed - existing policies apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE family_members ADD COLUMN avatar text DEFAULT '👤';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'relation'
  ) THEN
    ALTER TABLE family_members ADD COLUMN relation text DEFAULT 'Self';
  END IF;
END $$;
