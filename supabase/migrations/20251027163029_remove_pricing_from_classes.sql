/*
  # Remove Pricing Fields from Classes Table

  1. Changes to `classes` table
    - Remove `price_per_class` column - pricing now derived from payment records
    - Remove `currency` column - currency stored per payment instead
  
  2. Purpose
    - Simplify class management by separating pricing from class definition
    - All pricing information now tracked exclusively through payment records
    - Each payment can have its own currency and pricing
  
  3. Notes
    - Existing data in these columns will be permanently removed
    - Pricing should be derived from payments table going forward
    - This migration is part of the UX refactor to separate payment tracking from class metadata
*/

-- Remove price_per_class column from classes table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'price_per_class'
  ) THEN
    ALTER TABLE classes DROP COLUMN price_per_class;
  END IF;
END $$;

-- Remove currency column from classes table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'currency'
  ) THEN
    ALTER TABLE classes DROP COLUMN currency;
  END IF;
END $$;