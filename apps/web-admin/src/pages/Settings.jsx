import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useAuth, useForm } from '../hooks';
import { Lock, User } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { authApi } from '../api';
import FormInput from '../components/forms/FormInput';
import Button from '../components/shared/Button';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  
  // Profile form using useForm hook
  const profileForm = useForm(
    {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
    null, // No validation function for now
    async (values) => {
      const result = await updateProfile(values);
      if (result.success) {
        toast.success('Profile updated successfully');
        return result;
      } else {
        toast.error(result.message || 'Failed to update profile');
        throw new Error(result.message || 'Failed to update profile');
      }
    }
  );

  // Password form using useForm hook
  const passwordForm = useForm(
    {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    (values) => {
      const errors = {};
      if (values.newPassword !== values.confirmPassword) {
        errors.confirmPassword = 'New passwords do not match';
      }
      if (values.newPassword.length > 0 && values.newPassword.length < 6) {
        errors.newPassword = 'Password must be at least 6 characters';
      }
      return errors;
    },
    async (values) => {
      const response = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (response.success) {
        toast.success('Password changed successfully');
        passwordForm.reset();
        return response;
      } else {
        toast.error(response.message || 'Failed to change password');
        throw new Error(response.message || 'Failed to change password');
      }
    }
  );

  // Update profile form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.setValues({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    // intentional: sync form only when user identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h2>
          </div>

          <form onSubmit={profileForm.handleSubmit}>
            <FormInput
              label="Name"
              name="name"
              value={profileForm.values.name}
              onChange={profileForm.handleChange}
              onBlur={profileForm.handleBlur}
              error={profileForm.touched.name ? profileForm.errors.name : undefined}
              required
            />

            <FormInput
              label="Email"
              name="email"
              type="email"
              value={profileForm.values.email}
              onChange={profileForm.handleChange}
              onBlur={profileForm.handleBlur}
              error={profileForm.touched.email ? profileForm.errors.email : undefined}
              disabled
            />

            <FormInput
              label="Phone"
              name="phone"
              value={profileForm.values.phone}
              onChange={profileForm.handleChange}
              onBlur={profileForm.handleBlur}
              error={profileForm.touched.phone ? profileForm.errors.phone : undefined}
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <span className={`px-3 py-2 inline-block text-sm rounded-lg font-medium ${
                user?.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                user?.role === 'agent' ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {user?.role || 'user'}
              </span>
            </div>

            <Button type="submit" variant="primary" isLoading={profileForm.isSubmitting}>
              Update Profile
            </Button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Change Password
            </h2>
          </div>

          <form onSubmit={passwordForm.handleSubmit}>
            <FormInput
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordForm.values.currentPassword}
              onChange={passwordForm.handleChange}
              onBlur={passwordForm.handleBlur}
              error={passwordForm.touched.currentPassword ? passwordForm.errors.currentPassword : undefined}
              required
            />

            <FormInput
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordForm.values.newPassword}
              onChange={passwordForm.handleChange}
              onBlur={passwordForm.handleBlur}
              error={passwordForm.touched.newPassword ? passwordForm.errors.newPassword : undefined}
              required
            />

            <FormInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordForm.values.confirmPassword}
              onChange={passwordForm.handleChange}
              onBlur={passwordForm.handleBlur}
              error={passwordForm.touched.confirmPassword ? passwordForm.errors.confirmPassword : undefined}
              required
            />

            <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Password must be at least 6 characters long
              </p>
            </div>

            <Button type="submit" variant="primary" isLoading={passwordForm.isSubmitting}>
              Change Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const SettingsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Settings"
      message="Something went wrong while loading the settings page. Please try refreshing the page."
    >
      <Settings />
    </ErrorBoundary>
  );
};

export default SettingsWithErrorBoundary;
