import { useState, useEffect, useMemo } from 'react';
import Modal from '../shared/Modal';
import FormInput from '../forms/FormInput';
import SelectInput from '../forms/SelectInput';
import Button from '../shared/Button';
import LocationAutocomplete from '../locations/LocationAutocomplete';
import { userApi, assignApi } from '../../api';
import { toast } from 'react-hot-toast';
import { User, Loader2, MapPin, X } from 'lucide-react';
import { useAuth } from '../../hooks';
import { USER_ROLES } from '../../utils/constants';
import logger from '../../utils/logger';

const EditUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    isActive: true,
    password: '',
    confirmPassword: '',
    defaultLocationId: '',
    assignedLocationIds: [],
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, _setLoading] = useState(false);
  const [selectedDefaultLocation, setSelectedDefaultLocation] = useState(null);
  const [selectedAssignedLocations, setSelectedAssignedLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Load agent's assigned locations
  const loadAgentLocations = async (agentId) => {
    if (!agentId) return;
    
    setLoadingLocations(true);
    try {
      const response = await assignApi.getAgentsWithLocations({
        search: '',
        page: 1,
        limit: 100,
      });
      
      if (response.success && response.data) {
        const agents = response.data.agents || response.data.data?.agents || [];
        const agent = agents.find(a => {
          const aId = a._id?.toString() || String(a._id);
          const uId = agentId?.toString() || String(agentId);
          return aId === uId;
        });
        
        if (agent && agent.locations) {
          setSelectedAssignedLocations(agent.locations);
          setFormData(prev => ({
            ...prev,
            assignedLocationIds: (agent.locations || []).map(loc => loc._id),
          }));
        }
      }
    } catch (error) {
      logger.error('Failed to load agent locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Load user data and locations
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        password: '',
        confirmPassword: '',
        defaultLocationId: '',
        assignedLocationIds: [],
      });
      setErrors({});
      setSelectedDefaultLocation(null);
      setSelectedAssignedLocations([]);
      
      // Load location data based on role
      if (user.role === USER_ROLES.USER) {
        // Load default location for user role
        if (user.defaultLocation) {
          const defaultLocation = typeof user.defaultLocation === 'object' && user.defaultLocation !== null
            ? user.defaultLocation 
            : null;
          if (defaultLocation) {
            setSelectedDefaultLocation(defaultLocation);
            setFormData(prev => ({
              ...prev,
              defaultLocationId: defaultLocation._id || defaultLocation,
            }));
          }
        }
      } else if (user.role === USER_ROLES.AGENT) {
        // Load assigned locations for agent role
        loadAgentLocations(user._id);
      }
    }
  }, [isOpen, user]);

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

    const canSetPassword = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN;
    if (canSetPassword) {
      const password = formData.password || '';
      const confirmPassword = formData.confirmPassword || '';
      if (password.trim().length > 0) {
        const trimmedPassword = password.trim();
        const policyOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(trimmedPassword);
        if (!policyOk) {
          newErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
        }
        if (password !== confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      };

      const canSetPassword = currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN;
      if (canSetPassword && (formData.password || '').trim().length > 0) {
        updateData.password = formData.password;
      }

      // Add location fields based on role
      if (formData.role === USER_ROLES.USER && formData.defaultLocationId) {
        updateData.defaultLocationId = formData.defaultLocationId;
      }
      
      if (formData.role === USER_ROLES.AGENT && formData.assignedLocationIds && formData.assignedLocationIds.length > 0) {
        updateData.assignedLocationIds = formData.assignedLocationIds;
      }

      const response = await userApi.updateUser(user._id, updateData);
      if (response.success) {
        toast.success('User updated successfully');
        onSuccess?.(response.data);
        handleClose();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update user';
      toast.error(message);
      
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      role: '',
      isActive: true,
      password: '',
      confirmPassword: '',
      defaultLocationId: '',
      assignedLocationIds: [],
    });
    setErrors({});
    setSelectedDefaultLocation(null);
    setSelectedAssignedLocations([]);
    onClose();
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

  const handleRemoveAssignedLocation = (locationId) => {
    const updatedLocations = selectedAssignedLocations.filter(loc => loc._id !== locationId);
    setSelectedAssignedLocations(updatedLocations);
    setFormData(prev => ({
      ...prev,
      assignedLocationIds: (updatedLocations || []).map(loc => loc._id),
    }));
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Get allowed roles based on current user's role
  const allowedRoles = useMemo(() => {
    if (!currentUser?.role) return [];
    
    const roleOptions = [
      { value: USER_ROLES.USER, label: 'User' },
      { value: USER_ROLES.AGENT, label: 'Agent' },
    ];

    if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
      roleOptions.push({ value: USER_ROLES.ADMIN, label: 'Admin' });
    }

    return roleOptions;
  }, [currentUser?.role]);

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit User" size="md">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}
      
      {!loading && (
        <form onSubmit={handleSubmit}>
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

          <SelectInput
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={allowedRoles}
            required
            error={errors.role}
          />

          {(currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Set Password
              </h3>
              <FormInput
                label="New Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep unchanged"
                error={errors.password}
              />
              <FormInput
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                error={errors.confirmPassword}
              />
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
              User is active (can login)
            </label>
          </div>

          {/* Location Assignment Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Assignment
            </h3>

            {/* Default Location for User Role */}
            {formData.role === USER_ROLES.USER && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Location
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {selectedDefaultLocation.locationName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {selectedDefaultLocation.address}
                            {selectedDefaultLocation.city && `, ${selectedDefaultLocation.city}`}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDefaultLocationSelect(null)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assigned Locations for Agent Role */}
            {formData.role === USER_ROLES.AGENT && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Locations
                </label>
                {loadingLocations ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading locations...</div>
                ) : (
                  <>
                    <LocationAutocomplete
                      value=""
                      onChange={() => {}}
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
                            className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg"
                          >
                            <div className="flex items-start flex-1 min-w-0">
                              <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {location.locationName}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                                  {location.address}
                                  {location.city && `, ${location.city}`}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignedLocation(location._id)}
                              className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                              aria-label="Remove location"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Info for other roles */}
            {formData.role !== USER_ROLES.USER && formData.role !== USER_ROLES.AGENT && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Location assignment is only available for User and Agent roles.
              </p>
            )}
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
              <User className="w-4 h-4 mr-2" />
              Update User
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditUserModal;
