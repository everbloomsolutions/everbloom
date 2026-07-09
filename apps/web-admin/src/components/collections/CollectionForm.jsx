import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import Button from '../shared/Button';
import FormInput from '../forms/FormInput';
import LocationAutocomplete from '../locations/LocationAutocomplete';
import {
  COLLECTION_LOCATION_OPTIONS,
  getLocationNameSuggestion,
  getGSTRateForMaterial,
  normalizeLocationName,
} from '../../types/collections';
import { INDIAN_STATES } from '../../utils/indianStates';
import { formatCurrency } from '../../utils/formatCurrency';
import { isAdmin } from '../../utils/permissionUtils';
import { USER_ROLES } from '../../utils/constants';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';
import { useLocationRates } from '../../hooks';

/**
 * CollectionForm Component
 * Handles create/edit collection modal with form logic
 */
const CollectionForm = ({
  isOpen,
  onClose,
  editingCollectionId,
  formData,
  setFormData,
  useExistingLocation,
  setUseExistingLocation,
  selectedLocationId,
  setSelectedLocationId,
  selectedLocationData,
  setSelectedLocationData,
  showLocationModal: _showLocationModal,
  onOpenLocationModal,
  user,
  onSubmit,
  onSuccess,
  isLoading = false,
}) => {
  // Calculate item amount
  const calculateItemAmount = (item) => {
    const weight = item.weight === '' ? 0 : (parseFloat(item.weight) || 0);
    const rate = item.rate === '' ? 0 : (parseFloat(item.rate) || 0);
    return weight * rate;
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalWeight = formData.collectionItems.reduce(
      (sum, item) => sum + (item.weight === '' ? 0 : (parseFloat(item.weight) || 0)),
      0
    );
    const subTotal = formData.collectionItems.reduce(
      (sum, item) => sum + calculateItemAmount(item),
      0
    );

    // Calculate GST per item based on material type and sum them
    const gstAmount = formData.collectionItems.reduce((sum, item) => {
      const itemAmount = calculateItemAmount(item);
      const itemGstRate = getGSTRateForMaterial(item.materialType);
      const itemGstAmount = (itemAmount * itemGstRate) / 100;
      return sum + itemGstAmount;
    }, 0);

    // Calculate weighted average GST rate for display purposes
    const gstRate = subTotal > 0 ? (gstAmount / subTotal) * 100 : 18;
    const totalAmount = subTotal + gstAmount;

    return { totalWeight, subTotal, gstRate, gstAmount, totalAmount };
  };

  const totals = calculateTotals();

  // Track which rates were auto-populated from location defaults
  const [autoPopulatedRates, setAutoPopulatedRates] = useState(new Set());
  const previousLocationIdRef = useRef(null);

  // Fetch location rates when a location is selected
  const { ratesMap, isLoading: ratesLoading } = useLocationRates(
    useExistingLocation ? selectedLocationId : null
  );

  // Force agents to use existing locations
  useEffect(() => {
    if (user?.role === USER_ROLES.AGENT && !useExistingLocation) {
      setUseExistingLocation(true);
    }
  }, [user?.role, useExistingLocation, setUseExistingLocation]);

  // Auto-populate rates when location rates are fetched
  useEffect(() => {
    // Only auto-populate if:
    // 1. We're using existing location
    // 2. Location ID exists and has changed (or rates just loaded for current location)
    // 3. Rates map has data
    // 4. Not currently loading rates
    // 5. We have collection items to populate
    const locationChanged = selectedLocationId && selectedLocationId !== previousLocationIdRef.current;
    const ratesJustLoaded = selectedLocationId &&
      previousLocationIdRef.current === selectedLocationId &&
      Object.keys(ratesMap).length > 0 &&
      !ratesLoading;

    if (
      useExistingLocation &&
      selectedLocationId &&
      Object.keys(ratesMap).length > 0 &&
      !ratesLoading &&
      (locationChanged || ratesJustLoaded) &&
      formData.collectionItems.length > 0
    ) {
      setFormData((prev) => {
        const updatedItems = prev.collectionItems.map((item, index) => {
          const rateFromLocation = ratesMap[item.materialType];

          // Only update if rate exists and item doesn't already have a manually set rate
          // (unless it was previously auto-populated)
          if (rateFromLocation !== undefined && rateFromLocation !== null) {
            const wasAutoPopulated = autoPopulatedRates.has(index);
            const hasNoRate = !item.rate || item.rate === '';

            // Update if it was auto-populated or has no rate
            if (wasAutoPopulated || hasNoRate) {
              return {
                ...item,
                rate: rateFromLocation,
              };
            }
          }

          return item;
        });

        // Track which rates were auto-populated
        const newAutoPopulated = new Set();
        updatedItems.forEach((item, index) => {
          const rateFromLocation = ratesMap[item.materialType];
          if (
            rateFromLocation !== undefined &&
            rateFromLocation !== null &&
            item.rate !== '' &&
            item.rate !== null &&
            item.rate !== undefined &&
            Number(item.rate) === Number(rateFromLocation)
          ) {
            newAutoPopulated.add(index);
          }
        });

        setAutoPopulatedRates(newAutoPopulated);

        // Only update previousLocationIdRef if location changed, not on every rate update
        if (locationChanged) {
          previousLocationIdRef.current = selectedLocationId;
        }

        // Show toast notification only if we actually populated some rates
        const populatedCount = newAutoPopulated.size;
        if (populatedCount > 0 && locationChanged) {
          toast.success(`Rates auto-populated from location defaults (${populatedCount} rate${populatedCount !== 1 ? 's' : ''})`, {
            duration: 3000,
          });
        }

        return {
          ...prev,
          collectionItems: updatedItems,
        };
      });
    }

    // Reset auto-populated rates when location is cleared
    if (!selectedLocationId && previousLocationIdRef.current) {
      setAutoPopulatedRates(new Set());
      previousLocationIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratesMap, selectedLocationId, useExistingLocation, ratesLoading, formData.collectionItems.length]);

  // Reset auto-populated rates when collection items change (user adds/removes items)
  useEffect(() => {
    // Clear auto-populated flags for items that no longer exist
    setAutoPopulatedRates((prev) => {
      const newSet = new Set();
      prev.forEach((index) => {
        if (index < formData.collectionItems.length) {
          newSet.add(index);
        }
      });
      return newSet;
    });
  }, [formData.collectionItems.length]);

  const handleAddCollectionItem = () => {
    const newItem = { materialType: 'mixed-plastic', weight: '', rate: '' };

    // If location rates are available, auto-populate rate for the new item
    if (useExistingLocation && selectedLocationId && Object.keys(ratesMap).length > 0) {
      const rateFromLocation = ratesMap[newItem.materialType];
      if (rateFromLocation !== undefined && rateFromLocation !== null) {
        newItem.rate = rateFromLocation;
      }
    }

    const newItems = [...formData.collectionItems, newItem];
    const newIndex = newItems.length - 1;

    setFormData({
      ...formData,
      collectionItems: newItems,
    });

    // Track auto-populated rate for new item if applicable
    if (newItem.rate && useExistingLocation && selectedLocationId && ratesMap[newItem.materialType]) {
      setAutoPopulatedRates((prev) => {
        const newSet = new Set(prev);
        newSet.add(newIndex);
        return newSet;
      });
    }
  };

  const handleRemoveCollectionItem = (index) => {
    const newItems = formData.collectionItems.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      collectionItems: newItems,
    });
  };

  const handleCollectionItemChange = (index, field, value) => {
    const newItems = [...formData.collectionItems];
    const currentItem = newItems[index];
    const wasAutoPopulated = autoPopulatedRates.has(index);
    const hasNoRate = !currentItem.rate || currentItem.rate === '';

    // Update the item
    newItems[index] = {
      ...currentItem,
      [field]: field === 'weight' || field === 'rate' ? (value === '' ? '' : (parseFloat(value) || 0)) : value,
    };

    // If materialType is changed, auto-populate rate from location rates if available
    if (field === 'materialType' && useExistingLocation && selectedLocationId && Object.keys(ratesMap).length > 0) {
      const newMaterialType = value;
      const rateFromLocation = ratesMap[newMaterialType];

      // Auto-populate rate if:
      // 1. Rate exists for the new material type
      // 2. Item was previously auto-populated OR has no rate
      if (rateFromLocation !== undefined && rateFromLocation !== null && (wasAutoPopulated || hasNoRate)) {
        newItems[index].rate = rateFromLocation;

        // Mark as auto-populated
        setAutoPopulatedRates((prev) => {
          const newSet = new Set(prev);
          newSet.add(index);
          return newSet;
        });
      } else if (rateFromLocation === undefined || rateFromLocation === null) {
        // If no rate available for new material type
        if (wasAutoPopulated) {
          // If it was auto-populated, clear the rate since it's for a different material type
          newItems[index].rate = '';
        }
        // Remove from auto-populated set
        setAutoPopulatedRates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }
    }

    // If user manually changes rate, remove from auto-populated set
    if (field === 'rate' && wasAutoPopulated) {
      setAutoPopulatedRates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }

    setFormData({
      ...formData,
      collectionItems: newItems,
    });
  };

  const handleLocationSelect = (location) => {
    if (location) {
      setSelectedLocationData(location);
      setSelectedLocationId(location._id);
      // Auto-populate form fields (editable)
      setFormData(prev => ({
        ...prev,
        locationType: location.locationType,
        locationName: location.locationName,
        locality: location.locality || '',
        address: location.address,
        city: location.city || '',
        state: location.state || '',
        zipCode: location.zipCode || '',
      }));
    } else {
      setSelectedLocationData(null);
      setSelectedLocationId('');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      if (useExistingLocation) {
        if (!selectedLocationId) {
          toast.error('Please select a location');
          const locationField = document.querySelector('[data-location-field]');
          if (locationField) {
            locationField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        if (user?.role === USER_ROLES.AGENT && selectedLocationData) {
          if (!selectedLocationData._id) {
            toast.error('Invalid location selected. Please select a valid location.');
            return;
          }
        }
      } else {
        if (!formData.locationName || !formData.locality || !formData.address) {
          toast.error('Location name, locality, and address are required');
          return;
        }
      }

      if (formData.collectionItems.length === 0) {
        toast.error('At least one collection item is required');
        return;
      }

      const hasInvalidItems = formData.collectionItems.some(
        (item) => {
          const weight = item.weight === '' ? 0 : (parseFloat(item.weight) || 0);
          const rate = item.rate === '' ? 0 : (parseFloat(item.rate) || 0);
          return !item.materialType || !item.weight || !item.rate || weight <= 0 || rate <= 0;
        }
      );

      if (hasInvalidItems) {
        toast.error('All collection items must have valid material type, weight (>0), and rate (>0)');
        return;
      }

      // Prepare location data based on mode
      let locationPayload = {};
      if (useExistingLocation && selectedLocationId) {
        const locationIdStr = typeof selectedLocationId === 'string'
          ? selectedLocationId.trim()
          : String(selectedLocationId).trim();

        if (!locationIdStr || locationIdStr === '') {
          toast.error('Please select a valid location');
          const locationField = document.querySelector('[data-location-field]');
          if (locationField) {
            locationField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        locationPayload = { locationId: locationIdStr };
      } else {
        if (user?.role === USER_ROLES.AGENT) {
          toast.error('Agents must use existing assigned locations. Manual entry is not allowed.', { duration: 5000 });
          const locationField = document.querySelector('[data-location-field]');
          if (locationField) {
            locationField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setUseExistingLocation(true);
          return;
        }

        if (editingCollectionId) {
          locationPayload = {
            locationId: null,
            locationType: formData.locationType,
            locationName: normalizeLocationName(formData.locationName),
            location: {
              locality: formData.locality,
              address: formData.address,
              ...(formData.city && { city: formData.city }),
              ...(formData.state && { state: formData.state }),
              ...(formData.zipCode && { zipCode: formData.zipCode }),
            },
          };
        } else {
          locationPayload = {
            locationType: formData.locationType,
            locationName: normalizeLocationName(formData.locationName),
            location: {
              locality: formData.locality,
              address: formData.address,
              ...(formData.city && { city: formData.city }),
              ...(formData.state && { state: formData.state }),
              ...(formData.zipCode && { zipCode: formData.zipCode }),
            },
          };
        }
      }

      // Build title and description
      const locationName = useExistingLocation && selectedLocationData
        ? selectedLocationData.locationName
        : formData.locationName;
      const locationType = useExistingLocation && selectedLocationData
        ? selectedLocationData.locationType
        : formData.locationType;

      const baseTitle = `Collection from ${locationName || 'Location'}`;
      const title = baseTitle.length >= 5 ? baseTitle : `${baseTitle} - Recycling Collection`;

      const baseDescription = `Recycling collection from ${locationType || 'location'}${locationName ? ` (${locationName})` : ''} on ${formData.collectionDate || new Date().toLocaleDateString()}`;
      const description = baseDescription.length >= 20
        ? baseDescription
        : `${baseDescription}. This collection includes ${formData.collectionItems.length} item(s) with various materials.`;

      const collectionData = {
        serviceType: 'recycling',
        title: title,
        description: description,
        ...locationPayload,
        collectionItems: formData.collectionItems.map((item) => {
          const weight = item.weight === '' ? 0 : parseFloat(item.weight);
          const rate = item.rate === '' ? 0 : parseFloat(item.rate);

          if (!item.materialType) {
            throw new Error('Material type is required for all items');
          }
          if (isNaN(weight) || weight <= 0) {
            throw new Error(`Invalid weight for ${item.materialType}: ${item.weight}`);
          }
          if (isNaN(rate) || rate < 0) {
            throw new Error(`Invalid rate for ${item.materialType}: ${item.rate}`);
          }

          return {
            materialType: item.materialType,
            weight: weight,
            rate: rate,
          };
        }),
        collectionDate: formData.collectionDate ? new Date(formData.collectionDate).toISOString() : undefined,
      };

      logger.info('Submitting collection with data:', {
        role: user?.role,
        useExistingLocation,
        selectedLocationId,
        editingCollectionId,
        collectionItemsCount: collectionData.collectionItems.length,
      });

      await onSubmit(collectionData, editingCollectionId);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Failed to submit collection:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit collection';

      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors;
        const errorMessages = validationErrors.map(err => `${err.path?.join('.') || 'field'}: ${err.message}`).join(', ');
        toast.error(`Validation failed: ${errorMessages}`, { duration: 6000 });
        return;
      }

      if (user?.role === USER_ROLES.AGENT) {
        if (errorMessage.includes('assigned location') || errorMessage.includes('location assigned to you')) {
          const action = editingCollectionId ? 'update' : 'create';
          toast.error(`You can only ${action} collections for locations assigned to you. Please select a location from your assigned locations.`, { duration: 5000 });
        } else if (errorMessage.includes('must select an existing assigned location') || errorMessage.includes('Cannot switch to manual entry')) {
          toast.error('Please select a location from the dropdown. Manual entry is not allowed for agents.', { duration: 5000 });
        } else if (errorMessage.includes('Location not found') || errorMessage.includes('Invalid or inactive location')) {
          toast.error('The selected location was not found or is inactive. Please select a different location.', { duration: 5000 });
        } else if (errorMessage.includes('locationId') || errorMessage.includes('location')) {
          toast.error('Location is required. Please select a location from the dropdown.', { duration: 5000 });
        } else if (errorMessage.includes('created, collected') || errorMessage.includes('locations assigned')) {
          toast.error('You can only update collections you created, collected, or for locations assigned to you.', { duration: 5000 });
        } else {
          toast.error(errorMessage, { duration: 5000 });
        }
      } else {
        toast.error(errorMessage);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {editingCollectionId ? 'Edit Collection' : 'Create New Collection'}
        </h2>
        <div className="space-y-4">
          {/* Toggle between existing and manual entry - Only for admins */}
          {isAdmin(user) && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Location Entry Mode:
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setUseExistingLocation(true);
                    if (!useExistingLocation) {
                      setFormData(prev => ({
                        ...prev,
                        locationName: '',
                        locality: '',
                        address: '',
                        city: '',
                        state: '',
                        zipCode: '',
                      }));
                    }
                  }}
                  variant={useExistingLocation ? 'primary' : 'secondary'}
                  size="sm"
                >
                  Select Existing
                </Button>
                {user?.role !== USER_ROLES.AGENT && (
                  <Button
                    type="button"
                    onClick={() => {
                      setUseExistingLocation(false);
                      setSelectedLocationId('');
                      setSelectedLocationData(null);
                    }}
                    variant={!useExistingLocation ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Enter Manually
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* For agents, force useExistingLocation mode */}
          {user?.role === USER_ROLES.AGENT && (
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg mb-4">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                <strong>Note:</strong> As an agent, you can only edit collections using assigned locations. Manual entry is not allowed.
              </p>
            </div>
          )}

          {useExistingLocation ? (
            <>
              {/* Location Autocomplete */}
              <div data-location-field>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Location <span className="text-red-500">*</span>
                </label>
                {user?.role === USER_ROLES.AGENT && (
                  <div className="mb-2 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                    <p className="text-sm text-primary-800 dark:text-primary-200">
                      <strong>Note:</strong> You can only create collections for locations assigned to you. If you don&apos;t see any locations, contact an administrator to assign locations to your account.
                    </p>
                  </div>
                )}
                {!selectedLocationId && user?.role === USER_ROLES.AGENT && (
                  <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      ⚠️ Please select a location from the dropdown above. This field is required.
                    </p>
                  </div>
                )}
                <LocationAutocomplete
                  value={selectedLocationId}
                  onChange={(locationId) => {
                    setSelectedLocationId(locationId);
                    if (!locationId) {
                      setSelectedLocationData(null);
                    }
                  }}
                  onLocationSelect={handleLocationSelect}
                  placeholder="Search for a location..."
                />
                {isAdmin(user) && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      onClick={onOpenLocationModal}
                      variant="ghost"
                      size="sm"
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      + Create New Location
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Location fields - only show when NOT using existing location */}
          {!useExistingLocation && (
            <>
              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location Type *
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {COLLECTION_LOCATION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Name */}
              <FormInput
                label="Location Name"
                name="locationName"
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder={getLocationNameSuggestion(formData.locationType)}
                required
              />

              {/* Locality */}
              <FormInput
                label="Locality"
                name="locality"
                type="text"
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                placeholder="e.g., Koramangala, Whitefield"
                required
              />

              {/* Address */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormInput
                    label="Address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                    required
                  />
                </div>
                <FormInput
                  label="City"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>
                <FormInput
                  label="ZIP Code"
                  name="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="ZIP Code"
                />
              </div>
            </>
          )}

          {/* Collection Date */}
          <FormInput
            label="Collection Date"
            name="collectionDate"
            type="date"
            value={formData.collectionDate}
            onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
            required
          />

          {/* Collection Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Collection Items *
              </label>
              <Button
                onClick={handleAddCollectionItem}
                variant="ghost"
                size="sm"
                className="text-sm bg-primary-100 hover:bg-primary-200 text-primary-700"
                icon={Plus}
              >
                Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {formData.collectionItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <select
                      value={item.materialType}
                      onChange={(e) => handleCollectionItemChange(index, 'materialType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    >
                      <option value="mixed-plastic">Mixed Plastic</option>
                      <option value="paper">Paper</option>
                      <option value="iron">Iron</option>
                      <option value="aluminium">Aluminium</option>
                      <option value="wood">Wood</option>
                      <option value="copper">Copper</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={item.weight}
                      onChange={(e) => handleCollectionItemChange(index, 'weight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      placeholder="0.0"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-1 mb-1">
                      <label className="block text-xs text-gray-600 dark:text-gray-400">Rate (₹/kg)</label>
                      {autoPopulatedRates.has(index) && (
                        <div className="group relative">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                            <Info className="w-3 h-3 mr-0.5" />
                            Auto
                          </span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            Rate from location defaults (editable)
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleCollectionItemChange(index, 'rate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm ${autoPopulatedRates.has(index)
                          ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
                          : 'border-gray-300'
                        }`}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1">
                    <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Amount</span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(calculateItemAmount(item), { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {formData.collectionItems.length > 1 && (
                      <Button
                        onClick={() => handleRemoveCollectionItem(index)}
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove item"
                        icon={Trash2}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GST Rate (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GST Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={totals.gstRate.toFixed(2)}
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Calculated automatically: 5% for Wood/Paper, 18% for others
            </p>
          </div>

          {/* Totals Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>
                <span className="font-medium text-gray-900 dark:text-white">{totals.totalWeight.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.subTotal, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">GST ({totals.gstRate.toFixed(2)}%):</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.gstAmount, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                <span className="font-semibold text-gray-900 dark:text-white">Total Amount:</span>
                <span className="font-bold text-lg text-primary-600 dark:text-primary-400">{formatCurrency(totals.totalAmount, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="primary"
              isLoading={isLoading}
              loadingText={editingCollectionId ? 'Updating...' : 'Creating...'}
            >
              {editingCollectionId ? 'Update Collection' : 'Create Collection'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionForm;
