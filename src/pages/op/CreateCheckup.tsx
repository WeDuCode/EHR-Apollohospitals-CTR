import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { SearchInput } from '../../components/SearchInput';
import { StatusBadge } from '../../components/StatusBadge';
import { HistoryTable } from '../../components/HistoryTable';

type Patient = Database['public']['Tables']['patients']['Row'];
type Checkup = Database['public']['Tables']['checkups']['Row'];

type CheckupWithPatient = Checkup & {
  patient: Patient;
};

export function CreateCheckup() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [checkups, setCheckups] = useState<CheckupWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [checkupDescription, setCheckupDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [patientsResponse, checkupsResponse] = await Promise.all([
          supabase
            .from('patients')
            .select('*')
            .order('entry_datetime', { ascending: false }),
          supabase
            .from('checkups')
            .select(`
              *,
              patient:patients(*)
            `)
            .order('checkup_date', { ascending: false })
        ]);

        if (patientsResponse.error) throw patientsResponse.error;
        if (checkupsResponse.error) throw checkupsResponse.error;

        setPatients(patientsResponse.data || []);
        
        const validCheckups = (checkupsResponse.data || []).filter(
          (checkup): checkup is CheckupWithPatient => 
            checkup.patient !== null
        );
        setCheckups(validCheckups);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: checkupError } = await supabase
        .from('checkups')
        .insert([
          {
            patient_id: selectedPatient.id,
            checkup_description: checkupDescription,
            created_by: (await supabase.auth.getUser()).data.user!.id,
          },
        ]);

      if (checkupError) throw checkupError;

      setSuccess(true);
      setCheckupDescription('');
      setSelectedPatient(null);
      
      // Refresh data
      const { data: updatedCheckups, error: refreshError } = await supabase
        .from('checkups')
        .select(`
          *,
          patient:patients(*)
        `)
        .order('checkup_date', { ascending: false });

      if (refreshError) throw refreshError;

      const validCheckups = (updatedCheckups || []).filter(
        (checkup): checkup is CheckupWithPatient => 
          checkup.patient !== null
      );
      setCheckups(validCheckups);
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
        <h2 className="text-2xl font-bold mb-4">Checkups</h2>
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
          <p className="text-green-800">Checkup created successfully!</p>
        </div>
      )}

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Patient Selection */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Select Patient</h3>
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
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                        <div className="text-sm text-gray-500">
                          {patient.gender}, {patient.age} years
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={patient.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            selectedPatient?.id === patient.id
                              ? 'bg-sky-100 text-sky-800'
                              : 'text-sky-600 hover:bg-sky-50'
                          }`}
                        >
                          {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checkup Form */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Checkup Details</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedPatient && (
                <div className="bg-sky-50 p-4 rounded-md">
                  <p className="text-sm text-sky-800">
                    Creating checkup for: <span className="font-medium">{selectedPatient.name}</span>
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="checkupDescription" className="block text-sm font-medium text-gray-700">
                  Checkup Description
                </label>
                <textarea
                  id="checkupDescription"
                  rows={6}
                  required
                  value={checkupDescription}
                  onChange={(e) => setCheckupDescription(e.target.value)}
                  placeholder="Enter detailed checkup notes..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedPatient || submitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
              >
                {submitting ? 'Creating Checkup...' : 'Create Checkup'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <HistoryTable
          title="Checkup History"
          data={checkups}
          columns={[
            {
              header: 'Patient',
              key: (checkup) => (
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {checkup.patient.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {checkup.patient.gender}, {checkup.patient.age} years
                  </div>
                </div>
              ),
            },
            {
              header: 'Description',
              key: 'checkup_description',
            },
            {
              header: 'Date',
              key: (checkup) => new Date(checkup.checkup_date).toLocaleDateString(),
              width: '150',
            },
          ]}
          searchPlaceholder="Search patients or descriptions..."
          getSearchString={(checkup) => 
            `${checkup.patient.name} ${checkup.checkup_description}`
          }
        />
      )}
    </div>
  );
}