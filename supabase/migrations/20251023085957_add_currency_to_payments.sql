/*
  # Add Currency Field to Payments Table

  1. Changes
    - Add `currency` column to `payments` table with default value 'INR'
    - The column is of type text and includes common currency codes
    - Default is set to 'INR' for existing records

  2. Security
    - No changes to RLS policies
*/

-- Add currency column to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE payments ADD COLUMN currency text DEFAULT 'INR' NOT NULL;
  END IF;
END $$;

-- Update existing records to have INR as currency
UPDATE payments SET currency = 'INR' WHERE currency IS NULL;