import { useState, useMemo, useEffect } from 'react';
import Modal from '../shared/Modal';
import FormInput from '../forms/FormInput';
import SelectInput from '../forms/SelectInput';
import Button from '../shared/Button';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import LocationAutocomplete from '../locations/LocationAutocomplete';
import ConfirmationModal from '../shared/ConfirmationModal';
import { userApi } from '../../api';
import { generatePassword } from '../../utils/passwordGenerator';
import { toast } from 'react-hot-toast';
import { UserPlus, Eye, EyeOff, RefreshCw, MapPin, X } from 'lucide-react';
import logger from '../../utils/logger';
import { useAuth, useModal, useModalWithData } from '../../hooks';
import { USER_ROLES } from '../../utils/constants';

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '', // Will be set based on allowed roles
    isActive: true,
    defaultLocationId: '', // For 'user' role
    assignedLocationIds: [], // For 'agent' role
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDefaultLocation, setSelectedDefaultLocation] = useState(null);
  const [selectedAssignedLocations, setSelectedAssignedLocations] = useState([]);

  // Modal for location reassignment confirmation
  const { isOpen: showReassignmentConfirm, open: openReassignmentConfirm, close: closeReassignmentConfirm } = useModal();
  const { data: reassignmentData, openWithData: openReassignmentConfirmWithData, close: closeReassignmentConfirmData } = useModalWithData({
    onClose: () => {
      closeReassignmentConfirm();
    },
  });

  const generateSecurePassword = () => {
    setIsGenerating(true);
    try {
      const password = generatePassword({ length: 12 });
      setFormData(prev => ({ ...prev, password }));
      setShowPassword(true);
      // Clear password error if any
      if (errors.password) {
        setErrors(prev => ({ ...prev, password: '' }));
      }
      toast.success('Secure password generated');
    } catch (error) {
      logger.error('Failed to generate password:', error);
      toast.error('Failed to generate password');
    } finally {
      setIsGenerating(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Validate location requirements based on role
    if (formData.role === USER_ROLES.USER && !formData.defaultLocationId) {
      newErrors.defaultLocationId = 'Default location is required for users';
    }

    if (formData.role === USER_ROLES.AGENT && (!formData.assignedLocationIds || formData.assignedLocationIds.length === 0)) {
      newErrors.assignedLocationIds = 'At least one location must be assigned to agents';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data for submission
      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        isActive: formData.isActive,
      };

      // Add location fields based on role
      if (formData.role === USER_ROLES.USER && formData.defaultLocationId) {
        submitData.defaultLocationId = formData.defaultLocationId;
      }

      if (formData.role === USER_ROLES.AGENT && formData.assignedLocationIds && formData.assignedLocationIds.length > 0) {
        submitData.assignedLocationIds = formData.assignedLocationIds;
      }

      const response = await userApi.createUser(submitData);
      if (response.success) {
        toast.success(`User created successfully! Email: ${formData.email}`);
        onSuccess?.(response.data);
        handleClose();
      }
    } catch (error) {
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || 'Failed to create user';

      // Handle duplicate user error
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        setErrors(prev => ({
          ...prev,
          email: 'A user with this email already exists. Please use a different email address.'
        }));
        toast.error('This email is already registered. Please use a different email.');
      }
      // Handle validation errors from backend
      else if (errorData.errors && Array.isArray(errorData.errors)) {
        const fieldErrors = {};
        errorData.errors.forEach(err => {
          const field = err.field || err.path;
          if (field) {
            // Map backend field names to frontend field names
            const frontendField = field === 'body.email' ? 'email' :
              field === 'body.name' ? 'name' :
                field === 'body.password' ? 'password' :
                  field === 'body.role' ? 'role' :
                    field === 'body.defaultLocationId' ? 'defaultLocationId' :
                      field === 'body.assignedLocationIds' ? 'assignedLocationIds' :
                        field.replace('body.', '');
            fieldErrors[frontendField] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please fix the errors in the form');
      }
      // Generic error
      else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: defaultRole,
      isActive: true,
      defaultLocationId: '',
      assignedLocationIds: [],
    });
    setErrors({});
    setShowPassword(false);
    setSelectedDefaultLocation(null);
    setSelectedAssignedLocations([]);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    };

    // Clear location fields when role changes
    if (name === 'role') {
      if (value === USER_ROLES.USER) {
        updatedFormData.assignedLocationIds = [];
        setSelectedAssignedLocations([]);
      } else if (value === USER_ROLES.AGENT) {
        updatedFormData.defaultLocationId = '';
        setSelectedDefaultLocation(null);
      } else {
        updatedFormData.defaultLocationId = '';
        updatedFormData.assignedLocationIds = [];
        setSelectedDefaultLocation(null);
        setSelectedAssignedLocations([]);
      }
    }

    setFormData(updatedFormData);
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDefaultLocationSelect = (location) => {
    if (location) {
      setSelectedDefaultLocation(location);
      setFormData(prev => ({ ...prev, defaultLocationId: location._id }));
      if (errors.defaultLocationId) {
        setErrors(prev => ({ ...prev, defaultLocationId: '' }));
      }
    } else {
      setSelectedDefaultLocation(null);
      setFormData(prev => ({ ...prev, defaultLocationId: '' }));
    }
  };

  const handleAddAssignedLocation = (location) => {
    if (location && !selectedAssignedLocations.find(loc => loc._id === location._id)) {
      // Check if location is already assigned to another agent
      // assignedToAgent can be an ObjectId string, ObjectId object, or populated object
      const assignedToAgentId = location.assignedToAgent
        ? (typeof location.assignedToAgent === 'object' && location.assignedToAgent !== null && '_id' in location.assignedToAgent
          ? location.assignedToAgent._id?.toString() || location.assignedToAgent.toString()
          : location.assignedToAgent.toString())
        : null;

      if (assignedToAgentId) {
        // Location is assigned to another agent - show confirmation
        const currentAgent = typeof location.assignedToAgent === 'object' && location.assignedToAgent !== null && 'name' in location.assignedToAgent
          ? location.assignedToAgent
          : { _id: assignedToAgentId, name: 'Another Agent', email: '' };

        openReassignmentConfirmWithData({
          location,
          currentAgent,
        });
        openReassignmentConfirm();
        return;
      }

      // Location is not assigned - add directly
      const updatedLocations = [...selectedAssignedLocations, location];
      setSelectedAssignedLocations(updatedLocations);
      setFormData(prev => ({
        ...prev,
        assignedLocationIds: (updatedLocations || []).map(loc => loc._id),
      }));
      if (errors.assignedLocationIds) {
        setErrors(prev => ({ ...prev, assignedLocationIds: '' }));
      }
    }
  };

  const confirmLocationReassignment = () => {
    if (!reassignmentData || !reassignmentData.location) return;

    const location = reassignmentData.location;
    const updatedLocations = [...selectedAssignedLocations, location];
    setSelectedAssignedLocations(updatedLocations);
    setFormData(prev => ({
      ...prev,
      assignedLocationIds: (updatedLocations || []).map(loc => loc._id),
    }));
    if (errors.assignedLocationIds) {
      setErrors(prev => ({ ...prev, assignedLocationIds: '' }));
    }

    closeReassignmentConfirm();
    closeReassignmentConfirmData();
  };

  const handleRemoveAssignedLocation = (locationId) => {
    const updatedLocations = selectedAssignedLocations.filter(loc => loc._id !== locationId);
    setSelectedAssignedLocations(updatedLocations);
    setFormData(prev => ({
      ...prev,
      assignedLocationIds: (updatedLocations || []).map(loc => loc._id),
    }));
  };

  // Get allowed roles based on current user's role
  const allowedRoles = useMemo(() => {
    if (!user?.role) return [];

    const roleOptions = [
      { value: USER_ROLES.USER, label: 'User' },
      { value: USER_ROLES.AGENT, label: 'Agent' },
    ];

    // Super Admin can create: User, Agent, Admin
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      roleOptions.push({ value: USER_ROLES.ADMIN, label: 'Admin' });
    }
    // Admin can create: User, Agent (already in array)

    return roleOptions;
  }, [user?.role]);

  // Set default role to first allowed role
  const defaultRole = allowedRoles.length > 0 ? allowedRoles[0].value : USER_ROLES.AGENT;

  // Initialize role when modal opens or allowed roles change
  useEffect(() => {
    if (isOpen && allowedRoles.length > 0) {
      setFormData(prev => {
        // Only update if role is not set or not in allowed roles
        if (!prev.role || !allowedRoles.find(r => r.value === prev.role)) {
          const newRole = defaultRole;
          // Clear location fields when role changes
          const updatedData = {
            ...prev,
            role: newRole,
            defaultLocationId: '',
            assignedLocationIds: [],
          };
          if (newRole !== USER_ROLES.USER) {
            setSelectedDefaultLocation(null);
          }
          if (newRole !== USER_ROLES.AGENT) {
            setSelectedAssignedLocations([]);
          }
          return updatedData;
        }
        return prev;
      });
    }
  }, [isOpen, allowedRoles, defaultRole]);

  // Get error count for display
  const errorCount = Object.keys(errors).filter(key => errors[key]).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New User" size="md">
      <form onSubmit={handleSubmit}>
        {/* Error Summary */}
        {errorCount > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 font-semibold">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  Please fix {errorCount} error{errorCount > 1 ? 's' : ''} before submitting:
                </p>
                <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-400 space-y-1">
                  {errors.name && <li>Name: {errors.name}</li>}
                  {errors.email && <li>Email: {errors.email}</li>}
                  {errors.password && <li>Password: {errors.password}</li>}
                  {errors.role && <li>Role: {errors.role}</li>}
                  {errors.defaultLocationId && <li>Default Location: {errors.defaultLocationId}</li>}
                  {errors.assignedLocationIds && <li>Assigned Locations: {errors.assignedLocationIds}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
        <FormInput
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          error={errors.name}
        />

        <FormInput
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john.doe@example.com"
          required
          error={errors.email}
        />
        {errors.email && errors.email.includes('already exists') && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            💡 This email is already registered. If you need to reset the password for this user, use the &quot;Forgot Password&quot; feature or contact an administrator.
          </p>
        )}

        <div className="relative">
          <FormInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password or generate one"
            required
            error={errors.password}
            helperText="Minimum 6 characters"
          />
          <div className="absolute right-0 top-8 flex gap-2">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={generateSecurePassword}
              disabled={isGenerating}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
              title="Generate secure password"
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {formData.password && (
          <PasswordStrengthIndicator password={formData.password} />
        )}

        <SelectInput
          label="Role"
          name="role"
          value={formData.role || defaultRole}
          onChange={handleChange}
          options={allowedRoles}
          required
          error={errors.role}
          disabled={allowedRoles.length === 0}
        />

        {/* Location Selection for User Role */}
        {formData.role === USER_ROLES.USER && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Location <span className="text-red-500">*</span>
            </label>
            <LocationAutocomplete
              value={formData.defaultLocationId}
              onChange={(locationId) => {
                setFormData(prev => ({ ...prev, defaultLocationId: locationId }));
                if (errors.defaultLocationId) {
                  setErrors(prev => ({ ...prev, defaultLocationId: '' }));
                }
              }}
              onLocationSelect={handleDefaultLocationSelect}
              placeholder="Search for a location..."
            />
            {errors.defaultLocationId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.defaultLocationId}</p>
            )}
            {selectedDefaultLocation && (
              <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedDefaultLocation.locationName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedDefaultLocation.locality || selectedDefaultLocation.address}
                      {selectedDefaultLocation.city && `, ${selectedDefaultLocation.city}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Location Selection for Agent Role */}
        {formData.role === USER_ROLES.AGENT && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assigned Locations <span className="text-red-500">*</span>
            </label>
            <LocationAutocomplete
              value=""
              onChange={() => { }}
              onLocationSelect={handleAddAssignedLocation}
              placeholder="Search and add locations..."
            />
            {errors.assignedLocationIds && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.assignedLocationIds}</p>
            )}
            {selectedAssignedLocations.length > 0 && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Locations ({selectedAssignedLocations.length})
                </label>
                {(selectedAssignedLocations || []).map((location) => (
                  <div
                    key={location._id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-start justify-between"
                  >
                    <div className="flex items-start flex-1">
                      <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {location.locationName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {location.locality || location.address}
                          {location.city && `, ${location.city}`}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignedLocation(location._id)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Remove location"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={!!formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            User is active (can login immediately)
          </label>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </form>

      {/* Location Reassignment Confirmation Modal */}
      <ConfirmationModal
        isOpen={showReassignmentConfirm}
        onClose={() => {
          closeReassignmentConfirm();
          closeReassignmentConfirmData();
        }}
        onConfirm={confirmLocationReassignment}
        title="Reassign Location?"
        message={
          reassignmentData?.location && reassignmentData?.currentAgent
            ? `Location "${reassignmentData.location.locationName}" is currently assigned to agent "${reassignmentData.currentAgent.name || reassignmentData.currentAgent.email || 'another agent'}". Reassigning will remove it from the previous agent. Do you want to continue?`
            : reassignmentData?.location
              ? `Location "${reassignmentData.location.locationName}" is currently assigned to another agent. Reassigning will remove it from the previous agent. Do you want to continue?`
              : 'This location is currently assigned to another agent. Reassigning will remove it from the previous agent. Continue?'
        }
        confirmText="Yes, Reassign"
        cancelText="Cancel"
        variant="warning"
      />
    </Modal>
  );
};

export default CreateUserModal;

