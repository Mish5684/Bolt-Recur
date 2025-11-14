/*
  # Add Enhanced Class Details Fields

  1. Changes to `classes` table
    - Add `type` column for class category (Academic, Music, Dance, etc.)
    - Add `instructor` column for instructor name
    - Add `schedule` column (jsonb) for storing day/time combinations
    - Add `price_per_class` column for reference pricing
    - Add `currency` column with default 'USD'
  
  2. Purpose
    - Enable users to categorize classes by type
    - Store instructor information for each class
    - Store flexible schedule data as JSON (array of {day, time} objects)
    - Track pricing information per class
    - Support multiple currencies
  
  3. Notes
    - Schedule format: [{"day": "Mon", "time": "18:00"}, {"day": "Wed", "time": "18:00"}]
    - Type can be: Academic, Music, Dance, Sports, Martial Arts, Art & Craft, Language, Fitness, Technology, Other
    - All new columns are nullable to support existing data
*/

-- Add new columns to classes table
DO $$ 
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'type'
  ) THEN
    ALTER TABLE classes ADD COLUMN type text;
  END IF;

  -- Add instructor column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'instructor'
  ) THEN
    ALTER TABLE classes ADD COLUMN instructor text;
  END IF;

  -- Add schedule column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'schedule'
  ) THEN
    ALTER TABLE classes ADD COLUMN schedule jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add price_per_class column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'price_per_class'
  ) THEN
    ALTER TABLE classes ADD COLUMN price_per_class numeric(10,2);
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'currency'
  ) THEN
    ALTER TABLE classes ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;