export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PatientStatus = 'registered' | 'checked' | 'diagnosed' | 'prescribed';
export type Gender = 'male' | 'female' | 'other';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'doctor' | 'operations' | 'pharmacist'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'doctor' | 'operations' | 'pharmacist'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'doctor' | 'operations' | 'pharmacist'
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          name: string
          gender: Gender
          age: number
          entry_datetime: string
          status: PatientStatus
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          gender: Gender
          age: number
          entry_datetime?: string
          status?: PatientStatus
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          gender?: Gender
          age?: number
          entry_datetime?: string
          status?: PatientStatus
          created_by?: string
        }
      }
      checkups: {
        Row: {
          id: string
          patient_id: string
          checkup_description: string
          checkup_date: string
          created_by: string
        }
        Insert: {
          id?: string
          patient_id: string
          checkup_description: string
          checkup_date?: string
          created_by: string
        }
        Update: {
          id?: string
          patient_id?: string
          checkup_description?: string
          checkup_date?: string
          created_by?: string
        }
      }
      diagnoses: {
        Row: {
          id: string
          checkup_id: string
          diagnosis_description: string
          diagnosis_datetime: string
          created_by: string
        }
        Insert: {
          id?: string
          checkup_id: string
          diagnosis_description: string
          diagnosis_datetime?: string
          created_by: string
        }
        Update: {
          id?: string
          checkup_id?: string
          diagnosis_description?: string
          diagnosis_datetime?: string
          created_by?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          diagnosis_id: string
          prescription_details: string
          prescribed_datetime: string
          fulfilled: boolean
          fulfilled_datetime: string | null
          fulfilled_by: string | null
          created_by: string
        }
        Insert: {
          id?: string
          diagnosis_id: string
          prescription_details: string
          prescribed_datetime?: string
          fulfilled?: boolean
          fulfilled_datetime?: string | null
          fulfilled_by?: string | null
          created_by: string
        }
        Update: {
          id?: string
          diagnosis_id?: string
          prescription_details?: string
          prescribed_datetime?: string
          fulfilled?: boolean
          fulfilled_datetime?: string | null
          fulfilled_by?: string | null
          created_by?: string
        }
      }
    }
  }
}