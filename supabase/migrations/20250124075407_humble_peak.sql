/*
  # Enhanced Medical Records System
  
  1. New Tables
    - vital_signs
      - Track patient vitals during checkups
    - symptoms
      - Store common symptoms for reuse
    - checkup_symptoms
      - Link symptoms to checkups
    - icd_codes
      - Store ICD-10 codes and descriptions
    - diagnosis_codes
      - Link diagnoses to ICD codes
    - medications
      - Store medication catalog
    - drug_interactions
      - Track known drug interactions
    
  2. Changes to Existing Tables
    - checkups: Add vital signs columns
    - diagnoses: Add ICD code support
    - prescriptions: Add medication details
    
  3. Security
    - Enable RLS on all new tables
    - Maintain existing access patterns
*/

-- Create vital signs table
CREATE TABLE IF NOT EXISTS vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id uuid REFERENCES checkups(id) ON DELETE CASCADE,
  temperature decimal(4,1),
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  heart_rate integer,
  respiratory_rate integer,
  oxygen_saturation integer,
  recorded_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create checkup symptoms table
CREATE TABLE IF NOT EXISTS checkup_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id uuid REFERENCES checkups(id) ON DELETE CASCADE,
  symptom_id uuid REFERENCES symptoms(id) ON DELETE CASCADE,
  severity text CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create ICD codes table
CREATE TABLE IF NOT EXISTS icd_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create diagnosis codes table
CREATE TABLE IF NOT EXISTS diagnosis_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid REFERENCES diagnoses(id) ON DELETE CASCADE,
  icd_code_id uuid REFERENCES icd_codes(id) ON DELETE CASCADE,
  primary_diagnosis boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  generic_name text,
  form text NOT NULL,
  strength text NOT NULL,
  manufacturer text,
  description text,
  warnings text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create drug interactions table
CREATE TABLE IF NOT EXISTS drug_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id_1 uuid REFERENCES medications(id) ON DELETE CASCADE,
  medication_id_2 uuid REFERENCES medications(id) ON DELETE CASCADE,
  severity text CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(medication_id_1, medication_id_2)
);

-- Add columns to checkups table
ALTER TABLE checkups 
ADD COLUMN IF NOT EXISTS chief_complaint text,
ADD COLUMN IF NOT EXISTS physical_examination text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add columns to prescriptions table
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS medication_id uuid REFERENCES medications(id),
ADD COLUMN IF NOT EXISTS dosage text,
ADD COLUMN IF NOT EXISTS frequency text,
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS route text,
ADD COLUMN IF NOT EXISTS special_instructions text;

-- Enable RLS on all new tables
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkup_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE icd_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for vital signs
CREATE POLICY "All authenticated users can view vital signs"
  ON vital_signs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors and OP staff can create vital signs"
  ON vital_signs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'operations')
    )
  );

-- Create policies for symptoms
CREATE POLICY "All authenticated users can view symptoms"
  ON symptoms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can manage symptoms"
  ON symptoms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Create policies for checkup symptoms
CREATE POLICY "All authenticated users can view checkup symptoms"
  ON checkup_symptoms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors and OP staff can create checkup symptoms"
  ON checkup_symptoms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'operations')
    )
  );

-- Create policies for ICD codes
CREATE POLICY "All authenticated users can view ICD codes"
  ON icd_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can manage ICD codes"
  ON icd_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Create policies for diagnosis codes
CREATE POLICY "All authenticated users can view diagnosis codes"
  ON diagnosis_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can manage diagnosis codes"
  ON diagnosis_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Create policies for medications
CREATE POLICY "All authenticated users can view medications"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors and pharmacists can manage medications"
  ON medications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'pharmacist')
    )
  );

-- Create policies for drug interactions
CREATE POLICY "All authenticated users can view drug interactions"
  ON drug_interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors and pharmacists can manage drug interactions"
  ON drug_interactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'pharmacist')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkup_symptoms_checkup_id ON checkup_symptoms(checkup_id);
CREATE INDEX IF NOT EXISTS idx_checkup_symptoms_symptom_id ON checkup_symptoms(symptom_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_diagnosis_id ON diagnosis_codes(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_icd_code_id ON diagnosis_codes(icd_code_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_medication_ids ON drug_interactions(medication_id_1, medication_id_2);
CREATE INDEX IF NOT EXISTS idx_vital_signs_checkup_id ON vital_signs(checkup_id);
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_icd_codes_code ON icd_codes(code);