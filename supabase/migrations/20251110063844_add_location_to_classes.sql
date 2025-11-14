/*
  # Add Location Fields to Classes Table

  1. Changes to `classes` table
    - Add `location_name` column for place name (e.g., "Artstation Khar")
    - Add `address` column for full formatted address
    - Add `latitude` column for coordinate storage (for maps and distance calculations)
    - Add `longitude` column for coordinate storage
    - Add `pincode` column for future area-based filtering
    - Add `city` column for geographic context
    - Add `country` column for international support
    - Add `place_id` column to store Google Places ID for future API calls

  2. Purpose
    - Enable location tracking for each class
    - Support map display and navigation features
    - Enable future proximity-based searches
    - Support filtering classes by pincode/area
    - Provide data for distance calculations and route planning

  3. Notes
    - All location columns are nullable to support existing classes without location
    - Latitude and longitude use numeric type for precise coordinate storage
    - Place ID enables efficient Google Places API lookups
    - Pincode stored as text to support international postal codes
*/

-- Add location columns to classes table
DO $$
BEGIN
  -- Add location_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'location_name'
  ) THEN
    ALTER TABLE classes ADD COLUMN location_name text;
  END IF;

  -- Add address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'address'
  ) THEN
    ALTER TABLE classes ADD COLUMN address text;
  END IF;

  -- Add latitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE classes ADD COLUMN latitude numeric(10, 8);
  END IF;

  -- Add longitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE classes ADD COLUMN longitude numeric(11, 8);
  END IF;

  -- Add pincode column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'pincode'
  ) THEN
    ALTER TABLE classes ADD COLUMN pincode text;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'city'
  ) THEN
    ALTER TABLE classes ADD COLUMN city text;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'country'
  ) THEN
    ALTER TABLE classes ADD COLUMN country text;
  END IF;

  -- Add place_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE classes ADD COLUMN place_id text;
  END IF;
END $$;

-- Create an index on pincode for future filtering performance
CREATE INDEX IF NOT EXISTS idx_classes_pincode ON classes(pincode);

-- Create an index on city for future filtering performance
CREATE INDEX IF NOT EXISTS idx_classes_city ON classes(city);

-- Create a spatial index on coordinates for proximity searches
CREATE INDEX IF NOT EXISTS idx_classes_coordinates ON classes(latitude, longitude);
