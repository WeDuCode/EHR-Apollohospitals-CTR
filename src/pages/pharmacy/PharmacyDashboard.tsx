import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { HistoryTable } from '../../components/HistoryTable';

type Patient = Database['public']['Tables']['patients']['Row'];
type Diagnosis = Database['public']['Tables']['diagnoses']['Row'];
type Checkup = Database['public']['Tables']['checkups']['Row'];
type Prescription = Database['public']['Tables']['prescriptions']['Row'];

type DiagnosisWithDetails = Diagnosis & {
  checkup: Checkup & {
    patient: Patient;
  };
};

type PrescriptionWithDetails = Prescription & {
  diagnosis: DiagnosisWithDetails;
};

export function PharmacyDashboard() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const prescriptionsResponse = await supabase
          .from('prescriptions')
          .select(
            `
            *,
            diagnosis:diagnoses(
              *,
              checkup:checkups(
                *,
                patient:patients(*)
              )
            )
          `
          )
          .order('prescribed_datetime', { ascending: false });

        if (prescriptionsResponse.error) throw prescriptionsResponse.error;

        const validPrescriptions = (prescriptionsResponse.data || []).filter(
          (prescription): prescription is PrescriptionWithDetails =>
            prescription.diagnosis !== null &&
            prescription.diagnosis.checkup !== null &&
            prescription.diagnosis.checkup.patient !== null
        );
        setPrescriptions(validPrescriptions);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load prescription history. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredPrescriptions = prescriptions.filter((prescription) =>
    `${prescription.diagnosis.checkup.patient.name} ${prescription.prescription_details}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Prescription History</h2>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients or prescriptions..."
          className="block w-full mb-4 rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
        />
      </div>

      <HistoryTable
        title="Prescription History"
        data={filteredPrescriptions}
        columns={[
          {
            header: 'Patient',
            key: (prescription) => (
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {prescription.diagnosis.checkup.patient.name}
                </div>
                <div className="text-sm text-gray-500">
                  {prescription.diagnosis.checkup.patient.gender},{' '}
                  {prescription.diagnosis.checkup.patient.age} years
                </div>
              </div>
            ),
          },
          {
            header: 'Prescription',
            key: 'prescription_details',
          },
          {
            header: 'Date',
            key: (prescription) =>
              new Date(prescription.prescribed_datetime).toLocaleDateString(),
            width: '150',
          },
          {
            header: 'Status',
            key: (prescription) => (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  prescription.fulfilled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {prescription.fulfilled ? 'Fulfilled' : 'Pending'}
              </span>
            ),
            width: '100',
          },
        ]}
        searchPlaceholder="Search patients or prescriptions..."
        getSearchString={(prescription) =>
          `${prescription.diagnosis.checkup.patient.name} ${prescription.prescription_details}`
        }
      />
    </div>
  );
}
