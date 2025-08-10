/*
  # Healthcare Management System Schema

  1. New Tables
    - patients (patient information and status tracking)
    - checkups (patient checkup records)
    - diagnoses (diagnosis records)
    - prescriptions (prescription records)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Implement proper relationships and constraints

  3. Status Management
    - Add status tracking enum
    - Implement status update triggers
*/

-- Create enum for patient status
CREATE TYPE patient_status AS ENUM (
  'registered',
  'checked',
  'diagnosed',
  'prescribed'
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  age integer NOT NULL CHECK (age >= 0 AND age <= 150),
  entry_datetime timestamptz DEFAULT now(),
  status patient_status DEFAULT 'registered',
  created_by uuid REFERENCES auth.users(id)
);

-- Create checkups table
CREATE TABLE IF NOT EXISTS checkups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  checkup_description text NOT NULL,
  checkup_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(patient_id, checkup_date)
);

-- Create diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id uuid REFERENCES checkups(id) ON DELETE CASCADE,
  diagnosis_description text NOT NULL,
  diagnosis_datetime timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(checkup_id)
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid REFERENCES diagnoses(id) ON DELETE CASCADE,
  prescription_details text NOT NULL,
  prescribed_datetime timestamptz DEFAULT now(),
  fulfilled boolean DEFAULT false,
  fulfilled_datetime timestamptz,
  fulfilled_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(diagnosis_id)
);

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkups ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Policies for patients table
CREATE POLICY "All authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "OP staff can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'operations'
    )
  );

-- Policies for checkups table
CREATE POLICY "All authenticated users can view checkups"
  ON checkups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors and OP staff can create checkups"
  ON checkups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'operations')
    )
  );

-- Policies for diagnoses table
CREATE POLICY "All authenticated users can view diagnoses"
  ON diagnoses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only doctors can create diagnoses"
  ON diagnoses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Policies for prescriptions table
CREATE POLICY "All authenticated users can view prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only doctors can create prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Create function to handle prescription fulfillment updates
CREATE OR REPLACE FUNCTION check_prescription_update()
RETURNS trigger AS $$
BEGIN
  -- Only allow pharmacists to update fulfillment status
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'pharmacist'
  ) THEN
    RAISE EXCEPTION 'Only pharmacists can update prescription fulfillment status';
  END IF;

  -- Only allow updating fulfillment-related fields
  IF NEW.prescription_details != OLD.prescription_details OR
     NEW.diagnosis_id != OLD.diagnosis_id OR
     NEW.prescribed_datetime != OLD.prescribed_datetime OR
     NEW.created_by != OLD.created_by THEN
    RAISE EXCEPTION 'Only fulfillment status can be updated';
  END IF;

  -- Set fulfilled_datetime and fulfilled_by when marking as fulfilled
  IF NEW.fulfilled = true AND OLD.fulfilled = false THEN
    NEW.fulfilled_datetime := now();
    NEW.fulfilled_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for prescription fulfillment updates
CREATE TRIGGER check_prescription_update_trigger
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_prescription_update();

-- Create function to update patient status
CREATE OR REPLACE FUNCTION update_patient_status()
RETURNS trigger AS $$
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'checkups' THEN
      UPDATE patients 
      SET status = 'checked'::patient_status
      WHERE id = NEW.patient_id 
      AND status = 'registered'::patient_status;
    
    WHEN 'diagnoses' THEN
      UPDATE patients 
      SET status = 'diagnosed'::patient_status
      WHERE id = (
        SELECT patient_id 
        FROM checkups 
        WHERE id = NEW.checkup_id
      )
      AND status = 'checked'::patient_status;
    
    WHEN 'prescriptions' THEN
      UPDATE patients 
      SET status = 'prescribed'::patient_status
      WHERE id = (
        SELECT patient_id 
        FROM checkups 
        WHERE id = (
          SELECT checkup_id 
          FROM diagnoses 
          WHERE id = NEW.diagnosis_id
        )
      )
      AND status = 'diagnosed'::patient_status;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for status updates
CREATE TRIGGER update_status_on_checkup
  AFTER INSERT ON checkups
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_status();

CREATE TRIGGER update_status_on_diagnosis
  AFTER INSERT ON diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_status();

CREATE TRIGGER update_status_on_prescription
  AFTER INSERT ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_status();