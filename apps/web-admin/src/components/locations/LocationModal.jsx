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
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    setDuplicates([]);
    setShowDuplicateWarning(false);
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
    setDuplicates([]);
    setShowDuplicateWarning(false);
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

  const checkForDuplicates = async (excludeId) => {
    try {
      const submitData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        group: formData.group || undefined,
        notes: formData.notes || undefined,
      };

      if (excludeId) {
        submitData.excludeId = excludeId;
      }

      const response = await locationApi.checkDuplicates(submitData);
      if (response.success && response.data.duplicates && response.data.duplicates.length > 0) {
        setDuplicates(response.data.duplicates);
        return true;
      }
      setDuplicates([]);
      setShowDuplicateWarning(false);
      return false;
    } catch (error) {
      logger.error('Failed to check duplicates:', error);
      setDuplicates([]);
      setShowDuplicateWarning(false);
      return false;
    }
  };

  const resetAndClose = () => {
    resetForm();
    onClose();
  };

  const saveLocation = async () => {
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

      resetAndClose();

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (showDuplicateWarning) {
      return;
    }

    const hasDuplicates = await checkForDuplicates(isEditMode ? location._id : undefined);
    if (hasDuplicates) {
      setShowDuplicateWarning(true);
      return;
    }

    await saveLocation();
  };

  const handleUseExisting = () => {
    if (duplicates.length > 0) {
      const existingLocation = duplicates[0].location;
      toast.info(`Please use existing location: ${existingLocation.locationName}`);
    }
    resetAndClose();
  };

  const handleCreateAnyway = () => {
    setShowDuplicateWarning(false);
    saveLocation();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
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

        {showDuplicateWarning && duplicates.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Possible duplicate locations found
            </h4>
            <ul className="space-y-2 mb-3">
              {duplicates.map((dup, index) => (
                <li key={dup.location?._id || index} className="text-sm text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">{dup.location?.locationName}</span>
                  {dup.location?.locality && `, ${dup.location.locality}`}
                  {dup.location?.address && ` - ${dup.location.address}`}
                  <span className="ml-2 text-xs">
                    ({Math.round(dup.similarity * 100)}% match - {dup.matchReason})
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUseExisting}
              >
                Use Existing
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateAnyway}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isEditMode ? 'Update Anyway' : 'Create Anyway'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={resetAndClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || showDuplicateWarning}
          >
            {isEditMode ? 'Update Location' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LocationModal;

