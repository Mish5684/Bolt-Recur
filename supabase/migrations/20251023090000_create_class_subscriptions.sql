/*
  # Create class subscriptions table

  1. New Tables
    - `class_subscriptions`
      - `id` (uuid, primary key)
      - `family_member_id` (uuid, foreign key to family_members)
      - `class_id` (uuid, foreign key to classes)
      - `created_at` (timestamptz, default now())
      - Unique constraint on (family_member_id, class_id) to prevent duplicate subscriptions

  2. Security
    - Enable RLS on `class_subscriptions` table
    - Add policy for public access (temporary, for development)

  3. Notes
    - This separates subscription management from attendance tracking
    - Members can be subscribed to classes without any attendance records
    - Each member-class pair can only have one subscription
*/

-- Create class_subscriptions table
CREATE TABLE IF NOT EXISTS class_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(family_member_id, class_id)
);

-- Enable RLS
ALTER TABLE class_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (development)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_subscriptions'
    AND policyname = 'Allow all access to class_subscriptions'
  ) THEN
    CREATE POLICY "Allow all access to class_subscriptions"
      ON class_subscriptions
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
