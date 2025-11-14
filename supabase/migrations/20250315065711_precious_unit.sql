/*
  # Yoga Class Management Schema

  1. New Tables
    - `family_members`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the family member
      - `created_at` (timestamp)
    
    - `payments`
      - `id` (uuid, primary key)
      - `family_member_id` (uuid, foreign key)
      - `classes_paid` (integer) - Number of classes paid for
      - `amount` (integer) - Amount paid in INR
      - `payment_date` (date)
      - `created_at` (timestamp)
    
    - `class_attendance`
      - `id` (uuid, primary key)
      - `family_member_id` (uuid, foreign key)
      - `class_date` (date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read and write their own data
*/

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
    classes_paid integer NOT NULL,
    amount integer NOT NULL,
    payment_date date NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create class_attendance table
CREATE TABLE IF NOT EXISTS class_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
    class_date date NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON family_members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON family_members
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON payments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON payments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON class_attendance
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON class_attendance
    FOR INSERT TO authenticated WITH CHECK (true);

-- Insert initial family members
INSERT INTO family_members (name) VALUES
    ('Hirangi'),
    ('Mihir'),
    ('Anaira')
ON CONFLICT DO NOTHING;