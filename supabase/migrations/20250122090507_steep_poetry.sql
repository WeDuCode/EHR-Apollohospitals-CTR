/*
  # Add Insert Policy for Profiles

  1. Security Changes
    - Add new policy to allow users to create their initial profile
    - Uses safe IF NOT EXISTS check to prevent conflicts

  Note: This migration only adds the new INSERT policy, as other policies already exist
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;