// src/pages/Login.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth, useForm } from '../hooks';
import logger from '../utils/logger';
import { Mail, Lock, LogIn, Shield, Zap, BarChart3 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Form state using useForm hook
  const loginForm = useForm(
    {
      email: '',
      password: '',
    },
    (values) => {
      const errors = {};
      if (!values.email) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(values.email)) {
        errors.email = 'Email is invalid';
      }
      if (!values.password) {
        errors.password = 'Password is required';
      }
      return errors;
    },
    async (values) => {
      try {
        logger.debug('Attempting login with:', values.email);
        
        // Use AuthContext login method
        await login(values.email, values.password);
        
        logger.debug('Login successful! Navigating to dashboard...');
        
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
        
        return { success: true };
      } catch (err) {
        logger.error('Login error:', err);
        
        // Handle different error types
        const errorMessage = err.message || 'An error occurred during login';
        throw new Error(errorMessage);
      }
    }
  );

  // Extract error from form errors or submission error
  const error = loginForm.errors.email || loginForm.errors.password || '';

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl mb-4 shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Welcome Back</h2>
        <p className="text-gray-600 dark:text-gray-400">Sign in to access your admin dashboard</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={loginForm.handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="email"
              id="email"
              name="email"
              value={loginForm.values.email}
              onChange={loginForm.handleChange}
              onBlur={loginForm.handleBlur}
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                loginForm.touched.email && loginForm.errors.email
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="admin@everbloom.com"
              autoComplete="email"
            />
            {loginForm.touched.email && loginForm.errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{loginForm.errors.email}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="password"
              id="password"
              name="password"
              value={loginForm.values.password}
              onChange={loginForm.handleChange}
              onBlur={loginForm.handleBlur}
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                loginForm.touched.password && loginForm.errors.password
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {loginForm.touched.password && loginForm.errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{loginForm.errors.password}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <a href="/forgot-password" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
              Forgot password?
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={loginForm.isSubmitting}
          className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {loginForm.isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Logging in...</span>
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* Feature Highlights */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Secure</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-2">
              <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Fast</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;