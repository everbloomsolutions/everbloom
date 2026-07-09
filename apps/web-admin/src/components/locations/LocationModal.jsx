import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import FormInput from '../forms/FormInput';
import SelectInput from '../forms/SelectInput';
import Button from '../shared/Button';
import { locationApi } from '../../api';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import {
  COLLECTION_LOCATION_TYPES,
  COLLECTION_LOCATION_OPTIONS,
} from '../../types/collections';
import { INDIAN_STATES } from '../../utils/indianStates';

const LocationModal = ({ isOpen, onClose, onSuccess, location = null }) => {
  const isEditMode = !!location;
  const [formData, setFormData] = useState({
    locationType: COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    locationName: '',
    locality: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    tags: [],
    group: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [_showDuplicates, setShowDuplicates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setFormData({
          locationType: location.locationType || COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
          locationName: location.locationName || '',
          locality: location.locality || '',
          address: location.address || '',
          city: location.city || '',
          state: location.state || '',
          zipCode: location.zipCode || '',
          tags: location.tags || [],
          group: location.group || '',
          notes: location.notes || '',
        });
        setTagsInput((location.tags || []).join(', '));
      } else {
        resetForm();
      }
    }
  }, [isOpen, location]);

  const resetForm = () => {
    setFormData({
      locationType: COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
      locationName: '',
      locality: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      tags: [],
      group: '',
      notes: '',
    });
    setTagsInput('');
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTagsChange = (value) => {
    setTagsInput(value);
    const tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.locationName?.trim()) {
      newErrors.locationName = 'Location name is required';
    } else if (formData.locationName.trim().length < 2) {
      newErrors.locationName = 'Location name must be at least 2 characters';
    }

    if (!formData.locality?.trim()) {
      newErrors.locality = 'Locality is required';
    } else if (formData.locality.trim().length < 2) {
      newErrors.locality = 'Locality must be at least 2 characters';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForDuplicates = async () => {
    if (isEditMode) return; // Don't check duplicates when editing

    try {
      const submitData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        group: formData.group || undefined,
        notes: formData.notes || undefined,
      };

      const response = await locationApi.checkDuplicates(submitData);
      if (response.success && response.data.duplicates && response.data.duplicates.length > 0) {
        setDuplicates(response.data.duplicates);
        setShowDuplicates(true);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to check duplicates:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check for duplicates before creating
    if (!isEditMode) {
      const hasDuplicates = await checkForDuplicates();
      if (hasDuplicates) {
        return; // Don't proceed if duplicates found
      }
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        group: formData.group || undefined,
        notes: formData.notes || undefined,
      };

      if (isEditMode) {
        await locationApi.updateLocation(location._id, submitData);
        toast.success('Location updated successfully');
      } else {
        await locationApi.createLocation(submitData);
        toast.success('Location created successfully');
      }

      resetForm();
      setDuplicates([]);
      setShowDuplicates(false);
      onClose();

      try {
        onSuccess?.();
      } catch (error) {
        logger.error('LocationModal onSuccess callback failed:', error);
      }
    } catch (error) {
      logger.error('Failed to save location:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to save location';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleUseExisting = () => {
    if (duplicates.length > 0) {
      const existingLocation = duplicates[0].location;
      onClose();
      toast.info(`Please use existing location: ${existingLocation.locationName}`);
      // Could emit event to parent to select this location
    }
  };

  const _handleCreateAnyway = async () => {
    setShowDuplicates(false);
    setDuplicates([]);
    
    // Continue with creation
    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        group: formData.group || undefined,
        notes: formData.notes || undefined,
      };

      await locationApi.createLocation(submitData);
      toast.success('Location created successfully');
      resetForm();
      setDuplicates([]);
      setShowDuplicates(false);
      onClose();

      try {
        onSuccess?.();
      } catch (error) {
        logger.error('LocationModal onSuccess callback failed:', error);
      }
    } catch (error) {
      logger.error('Failed to save location:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to save location';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Location' : 'Create New Location'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location Type *
            </label>
            <SelectInput
              value={formData.locationType}
              onChange={(e) => handleChange('locationType', e.target.value)}
              options={COLLECTION_LOCATION_OPTIONS}
              error={errors.locationType}
            />
          </div>

          <div>
            <FormInput
              label="Location Name *"
              type="text"
              value={formData.locationName}
              onChange={(e) => handleChange('locationName', e.target.value)}
              error={errors.locationName}
              placeholder="e.g., Green Valley Apartments"
            />
          </div>
        </div>

        <FormInput
          label="Locality *"
          type="text"
          value={formData.locality}
          onChange={(e) => handleChange('locality', e.target.value)}
          error={errors.locality}
          placeholder="e.g., Koramangala, Whitefield"
        />

        <FormInput
          label="Address *"
          type="text"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          error={errors.address}
          placeholder="Street address"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="City"
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="City"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              State
            </label>
            <SelectInput
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              options={[
                { value: '', label: 'Select State' },
                ...INDIAN_STATES,
              ]}
              error={errors.state}
            />
          </div>

          <FormInput
            label="Zip Code"
            type="text"
            value={formData.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            placeholder="Zip Code"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g., Premium, High Volume"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group
            </label>
            <SelectInput
              value={formData.group}
              onChange={(e) => handleChange('group', e.target.value)}
              options={[
                { value: '', label: 'Select Group' },
                { value: 'Premium', label: 'Premium' },
                { value: 'Regular', label: 'Regular' },
                { value: 'High Volume', label: 'High Volume' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (Admin only)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Special instructions, access codes, etc."
            maxLength={2000}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
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
            {isEditMode ? 'Update Location' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LocationModal;

