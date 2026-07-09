// src/layouts/AuthLayout.jsx
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { Logo } from '../components/brand/Logo';
import { appConfig } from '../config/appConfig';

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl ring-4 ring-primary-100 dark:ring-primary-900/50">
              <Logo size="lg" className="max-w-[200px] max-h-[80px] w-auto h-auto" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{appConfig.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Onestop Recycling Solution Dashboard</p>
        </div>

        {/* Auth Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
          <Outlet />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400 animate-in fade-in">
          <p>&copy; {new Date().getFullYear()} Everbloom. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;