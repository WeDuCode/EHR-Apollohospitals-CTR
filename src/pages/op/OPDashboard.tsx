import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, ClipboardList } from 'lucide-react';

export function OPDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);

  const tabs = [
    { name: 'Patient List', path: '/op', icon: Users },
    { name: 'Register Patient', path: '/op/register', icon: UserPlus },
    { name: 'Create Checkup', path: '/op/checkup', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
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