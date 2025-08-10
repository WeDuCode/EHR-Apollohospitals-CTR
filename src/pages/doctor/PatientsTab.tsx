import { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { PatientList } from '../op/PatientList';
import { PatientRegistration } from '../op/PatientRegistration';

export function PatientsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'register'>('list');

  const subTabs = [
    { id: 'list', name: 'Patient List', icon: Users },
    { id: 'register', name: 'Register Patient', icon: UserPlus },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Patients</h2>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {subTabs.map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSubTab(id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeSubTab === id
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeSubTab === 'list' ? <PatientList /> : <PatientRegistration />}
    </div>
  );
}