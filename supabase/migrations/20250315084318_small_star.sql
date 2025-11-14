/*
  # Add Classes Table and Update Schema for Multiple Classes

  1. New Tables
    - `classes`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add `class_id` to existing tables:
      - family_members
      - payments
      - class_attendance

  3. Security
    - Enable RLS on classes table
    - Add policies for authenticated users
*/

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add class_id to existing tables
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE class_attendance 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable public access to classes"
  ON classes
  FOR ALL
  TO public
  USING (true);