import { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from 'react-router-dom';
import { UserRound, Stethoscope, PillIcon, Heart, LogOut } from 'lucide-react';
import { SignUpForm } from './components/SignUpForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OPDashboard } from './pages/op/OPDashboard';
import { PatientList } from './pages/op/PatientList';
import { PatientRegistration } from './pages/op/PatientRegistration';
import { CreateCheckup } from './pages/op/CreateCheckup';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { PharmacyDashboard } from './pages/pharmacy/PharmacyDashboard';
import { DiagnosePatient } from './pages/doctor/DiagnosePatient';
import { PrescribeMedicine } from './pages/doctor/PrescribeMedicine';
import { PatientsTab } from './pages/doctor/PatientsTab';
import { supabase } from './lib/supabase';
import type { Database } from './lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

function HomePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }

          setProfile(data || null);
        }
      } catch (error) {
        console.error('Error in getProfile:', error);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const getDashboardUrl = (role: string) => {
    switch (role) {
      case 'doctor':
        return '/doctor';
      case 'operations':
        return '/op';
      case 'pharmacist':
        return '/pharmacy';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-white shadow-md z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-sky-600" />
              <span className="ml-2 text-xl font-bold text-sky-600">
                Apollo EHR
              </span>
            </div>
            <div className="flex items-center space-x-8">
              <div className="hidden md:flex space-x-8">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-sky-600 transition-colors duration-200"
                >
                  Home
                </Link>
                <Link
                  to="/op"
                  className="text-gray-600 hover:text-sky-600 transition-colors duration-200"
                >
                  OP
                </Link>
                <Link
                  to="/doctor"
                  className="text-gray-600 hover:text-sky-600 transition-colors duration-200"
                >
                  Doctor
                </Link>
                <Link
                  to="/pharmacy"
                  className="text-gray-600 hover:text-sky-600 transition-colors duration-200"
                >
                  Pharmacy
                </Link>
              </div>
              {profile ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-600 hover:text-sky-600"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              ) : (
                <Link
                  to="/signup"
                  className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition-colors"
                >
                  Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="pt-24 pb-12 px-4 bg-cover bg-center h-screen flex items-center"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80")',
        }}
      >
        <div className="container mx-auto text-center text-white">
          {loading ? (
            <div className="animate-pulse">Loading...</div>
          ) : profile ? (
            <div className="space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold">
                Welcome{' '}
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </h1>
              <button
                onClick={() => navigate(getDashboardUrl(profile.role))}
                className="bg-sky-600 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-sky-700 transition-all duration-300 transform hover:scale-105"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-bold mb-12">
                I am a...
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { title: 'OP', icon: UserRound },
                  { title: 'Doctor', icon: Stethoscope },
                  { title: 'Pharmacy', icon: PillIcon },
                ].map(({ title, icon: Icon }) => (
                  <Link
                    key={title}
                    to="/signup"
                    className="group bg-white/10 backdrop-blur-sm p-8 rounded-lg hover:bg-sky-600 transition-all duration-300"
                  >
                    <Icon className="h-12 w-12 mx-auto mb-4 text-white" />
                    <span className="text-xl font-semibold">{title}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUpForm />} />

        {/* OP Routes */}
        <Route
          path="/op"
          element={
            <ProtectedRoute allowedRoles={['operations']}>
              <OPDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<PatientList />} />
          <Route path="register" element={<PatientRegistration />} />
          <Route path="checkup" element={<CreateCheckup />} />
        </Route>

        {/* Doctor Routes */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<PatientsTab />} />
          <Route path="checkup" element={<CreateCheckup />} />
          <Route path="diagnose" element={<DiagnosePatient />} />
          <Route path="prescribe" element={<PrescribeMedicine />} />
        </Route>

        <Route path="/pharmacy" element={<PharmacyDashboard />}>
          <Route index element={<PatientsTab />} />
          <Route path="checkup" element={<CreateCheckup />} />
          <Route path="diagnose" element={<DiagnosePatient />} />
          <Route path="prescribe" element={<PrescribeMedicine />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
