/*
  # Update patient registration permissions
  
  1. Changes
    - Modify RLS policy to allow both doctors and operations staff to register patients
    
  2. Security
    - Maintains read access for all authenticated users
    - Restricts patient creation to only doctors and operations staff
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "OP staff can create patients" ON patients;

-- Create new policy that allows both doctors and operations staff to create patients
CREATE POLICY "Doctors and OP staff can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'operations')
    )
  );