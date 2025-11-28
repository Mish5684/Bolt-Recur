/*
  # Add Class Pause Functionality

  1. Changes to `classes` table
    - Add `status` column (TEXT, either 'active' or 'paused', default 'active')
    - Add `paused_at` column (TIMESTAMPTZ, nullable, tracks when class was paused)
    - Add `paused_reason` column (TEXT, nullable, optional user note about pause reason)

  2. Indexes
    - Add index on `status` for efficient filtering
    - Add composite index on `user_id, status` for user-specific queries

  3. Notes
    - All existing classes will default to 'active' status
    - Pause is a soft state change - all historical data remains intact
    - RLS policies remain unchanged (status doesn't affect data access security)
*/

-- Add status column with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'status'
  ) THEN
    ALTER TABLE classes ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE classes ADD CONSTRAINT classes_status_check CHECK (status IN ('active', 'paused'));
  END IF;
END $$;

-- Add paused_at timestamp column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE classes ADD COLUMN paused_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add paused_reason text column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'paused_reason'
  ) THEN
    ALTER TABLE classes ADD COLUMN paused_reason TEXT;
  END IF;
END $$;

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

-- Create composite index for user-specific status queries
CREATE INDEX IF NOT EXISTS idx_classes_user_status ON classes(user_id, status);
