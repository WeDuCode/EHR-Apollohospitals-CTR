import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, ClipboardList, Stethoscope, FileText } from 'lucide-react';

export function DoctorDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);

  const tabs = [
    { name: 'Patients', path: '/doctor', icon: Users },
    { name: 'Checkups', path: '/doctor/checkup', icon: ClipboardList },
    { name: 'Diagnoses', path: '/doctor/diagnose', icon: Stethoscope },
    { name: 'Prescriptions', path: '/doctor/prescribe', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4">
              {tabs.map(({ name, path, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setActiveTab(path)}
                  className={`inline-flex items-center px-4 border-b-2 text-sm font-medium ${
                    activeTab === path
                      ? 'border-sky-500 text-sky-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}