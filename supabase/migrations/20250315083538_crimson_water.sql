/*
  # Add class name table

  1. New Tables
    - `class_settings`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `class_settings` table
    - Add policy for public access
*/

CREATE TABLE IF NOT EXISTS class_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE class_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public access to class settings"
  ON class_settings
  FOR ALL
  TO public
  USING (true);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_class_settings_updated_at
    BEFORE UPDATE ON class_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();