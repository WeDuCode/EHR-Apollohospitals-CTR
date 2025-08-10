import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { SearchInput } from '../../components/SearchInput';
import { StatusBadge } from '../../components/StatusBadge';
import { HistoryTable } from '../../components/HistoryTable';

type Patient = Database['public']['Tables']['patients']['Row'];
type Checkup = Database['public']['Tables']['checkups']['Row'];
type Diagnosis = Database['public']['Tables']['diagnoses']['Row'];

type CheckupWithPatient = Checkup & {
  patient: Patient;
};

type DiagnosisWithDetails = Diagnosis & {
  checkup: CheckupWithPatient;
};

export function DiagnosePatient() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [checkups, setCheckups] = useState<CheckupWithPatient[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCheckup, setSelectedCheckup] = useState<CheckupWithPatient | null>(null);
  const [diagnosisDescription, setDiagnosisDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [checkupsResponse, diagnosesResponse] = await Promise.all([
          supabase
            .from('checkups')
            .select(`
              *,
              patient:patients(*)
            `)
            .order('checkup_date', { ascending: false }),
          supabase
            .from('diagnoses')
            .select(`
              *,
              checkup:checkups(
                *,
                patient:patients(*)
              )
            `)
            .order('diagnosis_datetime', { ascending: false })
        ]);

        if (checkupsResponse.error) throw checkupsResponse.error;
        if (diagnosesResponse.error) throw diagnosesResponse.error;

        const validCheckups = (checkupsResponse.data || []).filter(
          (checkup): checkup is CheckupWithPatient => 
            checkup.patient !== null
        );
        setCheckups(validCheckups);

        const validDiagnoses = (diagnosesResponse.data || []).filter(
          (diagnosis): diagnosis is DiagnosisWithDetails =>
            diagnosis.checkup !== null &&
            diagnosis.checkup.patient !== null
        );
        setDiagnoses(validDiagnoses);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredCheckups = checkups.filter(checkup =>
    checkup.patient.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckup) {
      setError('Please select a checkup');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: diagnosisError } = await supabase
        .from('diagnoses')
        .insert([
          {
            checkup_id: selectedCheckup.id,
            diagnosis_description: diagnosisDescription,
            created_by: (await supabase.auth.getUser()).data.user!.id,
          },
        ]);

      if (diagnosisError) throw diagnosisError;

      setSuccess(true);
      setDiagnosisDescription('');
      setSelectedCheckup(null);
      
      // Refresh diagnoses
      const { data: updatedDiagnoses, error: refreshError } = await supabase
        .from('diagnoses')
        .select(`
          *,
          checkup:checkups(
            *,
            patient:patients(*)
          )
        `)
        .order('diagnosis_datetime', { ascending: false });

      if (refreshError) throw refreshError;

      const validDiagnoses = (updatedDiagnoses || []).filter(
        (diagnosis): diagnosis is DiagnosisWithDetails =>
          diagnosis.checkup !== null &&
          diagnosis.checkup.patient !== null
      );
      setDiagnoses(validDiagnoses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        <h2 className="text-2xl font-bold mb-4">Diagnoses</h2>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'create'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Create New
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'history'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
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
          <p className="text-green-800">Diagnosis created successfully!</p>
        </div>
      )}

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkup Selection */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Select Patient Checkup</h3>
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
                      Checkup Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCheckups.map((checkup) => (
                    <tr key={checkup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{checkup.patient.name}</div>
                        <div className="text-sm text-gray-500">
                          {checkup.patient.gender}, {checkup.patient.age} years
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(checkup.checkup_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCheckup(checkup)}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            selectedCheckup?.id === checkup.id
                              ? 'bg-sky-100 text-sky-800'
                              : 'text-sky-600 hover:bg-sky-50'
                          }`}
                        >
                          {selectedCheckup?.id === checkup.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnosis Form */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Diagnosis Details</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedCheckup && (
                <div className="bg-sky-50 p-4 rounded-md space-y-2">
                  <p className="text-sm text-sky-800">
                    Creating diagnosis for: <span className="font-medium">{selectedCheckup.patient.name}</span>
                  </p>
                  <p className="text-sm text-sky-800">
                    Checkup Notes: <span className="font-medium">{selectedCheckup.checkup_description}</span>
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="diagnosisDescription" className="block text-sm font-medium text-gray-700">
                  Diagnosis Details
                </label>
                <textarea
                  id="diagnosisDescription"
                  rows={6}
                  required
                  value={diagnosisDescription}
                  onChange={(e) => setDiagnosisDescription(e.target.value)}
                  placeholder="Enter detailed diagnosis including symptoms, condition details, and medical observations..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedCheckup || submitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
              >
                {submitting ? 'Creating Diagnosis...' : 'Create Diagnosis'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <HistoryTable
          title="Diagnosis History"
          data={diagnoses}
          columns={[
            {
              header: 'Patient',
              key: (diagnosis) => (
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {diagnosis.checkup.patient.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {diagnosis.checkup.patient.gender}, {diagnosis.checkup.patient.age} years
                  </div>
                </div>
              ),
            },
            {
              header: 'Diagnosis',
              key: 'diagnosis_description',
            },
            {
              header: 'Date',
              key: (diagnosis) => new Date(diagnosis.diagnosis_datetime).toLocaleDateString(),
              width: '150',
            },
          ]}
          searchPlaceholder="Search patients or diagnoses..."
          getSearchString={(diagnosis) => 
            `${diagnosis.checkup.patient.name} ${diagnosis.diagnosis_description}`
          }
        />
      )}
    </div>
  );
}