import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { SearchInput } from '../../components/SearchInput';
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

export function PrescribeMedicine() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [diagnoses, setDiagnoses] = useState<DiagnosisWithDetails[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisWithDetails | null>(null);
  const [prescriptionDetails, setPrescriptionDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const diagnosesResponse = await supabase
          .from('diagnoses')
          .select(`
            *,
            checkup:checkups(
              *,
              patient:patients(*)
            )
          `)
          .order('diagnosis_datetime', { ascending: false });

        const prescriptionsResponse = await supabase
          .from('prescriptions')
          .select(`
            *,
            diagnosis:diagnoses(
              *,
              checkup:checkups(
                *,
                patient:patients(*)
              )
            )
          `)
          .order('prescribed_datetime', { ascending: false });

        if (diagnosesResponse.error) throw diagnosesResponse.error;
        if (prescriptionsResponse.error) throw prescriptionsResponse.error;

        // Filter valid data
        const validDiagnoses = (diagnosesResponse.data || []).filter(
          (diagnosis): diagnosis is DiagnosisWithDetails =>
            diagnosis.checkup !== null && diagnosis.checkup.patient !== null
        );

        const validPrescriptions = (prescriptionsResponse.data || []).filter(
          (prescription): prescription is PrescriptionWithDetails =>
            prescription.diagnosis !== null &&
            prescription.diagnosis.checkup !== null &&
            prescription.diagnosis.checkup.patient !== null
        );

        setDiagnoses(validDiagnoses);
        setPrescriptions(validPrescriptions);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredDiagnoses = diagnoses.filter((diagnosis) =>
    diagnosis.checkup.patient.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiagnosis) {
      setError('Please select a diagnosis.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated.');

      const { error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          diagnosis_id: selectedDiagnosis.id,
          prescription_details: prescriptionDetails,
          created_by: user.id,
        });

      if (prescriptionError) throw prescriptionError;

      setSuccess(true);
      setPrescriptionDetails('');
      setSelectedDiagnosis(null);

      // Refresh prescriptions
      const prescriptionsResponse = await supabase
        .from('prescriptions')
        .select(`
          *,
          diagnosis:diagnoses(
            *,
            checkup:checkups(
              *,
              patient:patients(*)
            )
          )
        `)
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
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <h2 className="text-2xl font-bold mb-4">Prescriptions</h2>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">Prescription created successfully!</p>
        </div>
      )}

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Diagnosis Selection */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Select Patient Diagnosis</h3>
            <div className="mb-4">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search patients..."
              />
            </div>
            <div className="overflow-y-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diagnosis Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDiagnoses.map((diagnosis) => (
                    <tr key={diagnosis.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {diagnosis.checkup.patient.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {diagnosis.checkup.patient.gender}, {diagnosis.checkup.patient.age} years
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(diagnosis.diagnosis_datetime).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDiagnosis(diagnosis)}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            selectedDiagnosis?.id === diagnosis.id
                              ? 'bg-sky-100 text-sky-800'
                              : 'text-sky-600 hover:bg-sky-50'
                          }`}
                        >
                          {selectedDiagnosis?.id === diagnosis.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prescription Form */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Prescription Details</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedDiagnosis && (
                <div className="bg-sky-50 p-4 rounded-md space-y-2">
                  <p className="text-sm text-sky-800">
                    Creating prescription for: <span className="font-medium">{selectedDiagnosis.checkup.patient.name}</span>
                  </p>
                  <p className="text-sm text-sky-800">
                    Diagnosis: <span className="font-medium">{selectedDiagnosis.diagnosis_description}</span>
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="prescriptionDetails" className="block text-sm font-medium text-gray-700">
                  Prescription Details
                </label>
                <textarea
                  id="prescriptionDetails"
                  rows={6}
                  required
                  value={prescriptionDetails}
                  onChange={(e) => setPrescriptionDetails(e.target.value)}
                  placeholder="Enter detailed prescription including medications, dosage, duration, and special instructions..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedDiagnosis || submitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
              >
                {submitting ? 'Creating Prescription...' : 'Create Prescription'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <HistoryTable
          title="Prescription History"
          data={prescriptions}
          columns={[
            {
              header: 'Patient',
              key: (prescription) => (
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {prescription.diagnosis.checkup.patient.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {prescription.diagnosis.checkup.patient.gender}, {prescription.diagnosis.checkup.patient.age} years
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
              key: (prescription) => new Date(prescription.prescribed_datetime).toLocaleDateString(),
              width: '150',
            },
            {
              header: 'Status',
              key: (prescription) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  prescription.fulfilled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
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
      )}
    </div>
  );
}
