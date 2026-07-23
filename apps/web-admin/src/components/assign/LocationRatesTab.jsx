import { useState, useEffect, useRef, useMemo } from 'react';
import { DollarSign, Save, AlertCircle, MapPin, Grid, Table as TableIcon, X, Copy, RotateCcw, RefreshCw, CheckCircle2 } from 'lucide-react';
import { assignApi } from '../../api';
import LocationAutocomplete from '../locations/LocationAutocomplete';
import Button from '../shared/Button';
import FormInput from '../forms/FormInput';
import Modal from '../shared/Modal';
import { toast } from 'react-hot-toast';
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS } from '../../types/collections';
import Skeleton from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import { useModalWithData } from '../../hooks';
import logger from '../../utils/logger';

const LocationRatesTab = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [rates, setRates] = useState({});
  const [originalRates, setOriginalRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const { data: copySourceLocation, isOpen: showCopyModal, openWithData: openCopyModal, close: closeCopyModal } = useModalWithData();
  const [lastSaved, setLastSaved] = useState(null);
  const formRef = useRef(null);

  // Ensure MATERIAL_TYPES is available - use useMemo to avoid conditional hook calls
  const materialTypes = useMemo(() => {
    if (!MATERIAL_TYPES || Object.keys(MATERIAL_TYPES).length === 0) {
      return [];
    }
    return Object.values(MATERIAL_TYPES);
  }, []);

  // Initialize rates for all material types
  useEffect(() => {
    const initialRates = {};
    materialTypes.forEach((materialType) => {
      initialRates[materialType] = '';
    });
    setRates(initialRates);
    setOriginalRates(initialRates);
  }, [materialTypes]);

  // Load rates when location is selected
  useEffect(() => {
    if (selectedLocation?._id && materialTypes.length > 0) {
      loadRates(selectedLocation._id);
    } else if (!selectedLocation?._id) {
      // Reset rates when no location is selected
      const initialRates = {};
      materialTypes.forEach((materialType) => {
        initialRates[materialType] = '';
      });
      setRates(initialRates);
      setOriginalRates(initialRates);
      setHasChanges(false);
      setLastSaved(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation?._id, materialTypes.length]);

  // Save recent location to localStorage
  useEffect(() => {
    if (selectedLocation?._id) {
      const recentLocations = JSON.parse(localStorage.getItem('materialRateRecentLocations') || '[]');
      const updated = [
        selectedLocation._id,
        ...recentLocations.filter(id => id !== selectedLocation._id)
      ].slice(0, 5);
      localStorage.setItem('materialRateRecentLocations', JSON.stringify(updated));
    }
  }, [selectedLocation]);

  const loadRates = async (locationId) => {
    try {
      setLoading(true);
      const response = await assignApi.getLocationRates(locationId);
      if (response.success) {
        const loadedRates = {};
        materialTypes.forEach((materialType) => {
          loadedRates[materialType] = '';
        });

        // Handle different response formats
        let ratesArray = [];
        if (response.data?.rates && Array.isArray(response.data.rates)) {
          ratesArray = response.data.rates;
        } else if (response.data?.data?.rates && Array.isArray(response.data.data.rates)) {
          ratesArray = response.data.data.rates;
        } else if (Array.isArray(response.data)) {
          ratesArray = response.data;
        } else if (Array.isArray(response.rates)) {
          ratesArray = response.rates;
        }

        // Populate with existing rates
        if (ratesArray.length > 0) {
          ratesArray.forEach((rate) => {
            if (rate.materialType && rate.rate !== undefined && rate.rate !== null) {
              loadedRates[rate.materialType] = rate.rate.toString();
            }
          });
        }

        setRates(loadedRates);
        setOriginalRates({ ...loadedRates });
        setHasChanges(false);
      }
    } catch (error) {
      logger.error('Failed to load rates:', error);
      toast.error(error.response?.data?.message || 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (materialType, value) => {
    // Remove currency symbol if present
    const cleanValue = value.replace(/₹\s*/g, '').trim();
    const numericValue = cleanValue === '' ? '' : parseFloat(cleanValue);
    if (cleanValue === '' || (!isNaN(numericValue) && numericValue >= 0)) {
      setRates((prev) => ({
        ...prev,
        [materialType]: cleanValue,
      }));
      setHasChanges(true);
    }
  };

  const handleCancelChanges = () => {
    setRates({ ...originalRates });
    setHasChanges(false);
    toast.success('Changes cancelled');
  };

  const handleResetAll = () => {
    if (!confirm('Are you sure you want to reset all rates for this location?')) {
      return;
    }
    const emptyRates = {};
    materialTypes.forEach((materialType) => {
      emptyRates[materialType] = '';
    });
    setRates(emptyRates);
    setHasChanges(true);
  };

  const handleSetDefaults = () => {
    // Default rates based on typical market values
    const defaultRates = {
      [MATERIAL_TYPES.MIXED_PLASTIC]: '18.00',
      [MATERIAL_TYPES.PAPER]: '5.00',
      [MATERIAL_TYPES.IRON]: '18.00',
      [MATERIAL_TYPES.ALUMINIUM]: '18.00',
      [MATERIAL_TYPES.WOOD]: '5.00',
      [MATERIAL_TYPES.COPPER]: '18.00',
    };
    setRates(defaultRates);
    setHasChanges(true);
    toast.success('Default rates applied');
  };

  const handleCopyFromLocation = async () => {
    if (!copySourceLocation?._id) {
      toast.error('Please select a source location');
      return;
    }

    try {
      const response = await assignApi.getLocationRates(copySourceLocation._id);
      if (response.success && response.data.rates) {
        const copiedRates = {};
        materialTypes.forEach((materialType) => {
          copiedRates[materialType] = '';
        });

        response.data.rates.forEach((rate) => {
          copiedRates[rate.materialType] = rate.rate.toString();
        });

        setRates(copiedRates);
        setHasChanges(true);
        closeCopyModal();
        toast.success(`Rates copied from ${copySourceLocation.locationName}`);
      }
    } catch (_error) {
      toast.error('Failed to copy rates');
    }
  };

  const handleSaveRates = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    // Validate rates
    const ratesToSave = [];
    for (const [materialType, rateValue] of Object.entries(rates)) {
      if (rateValue !== '' && rateValue !== null && rateValue !== undefined) {
        const cleanValue = rateValue.replace(/₹\s*/g, '').trim();
        const numericRate = parseFloat(cleanValue);
        if (isNaN(numericRate) || numericRate < 0) {
          toast.error(`Invalid rate for ${MATERIAL_TYPE_LABELS[materialType]}`);
          return;
        }
        ratesToSave.push({
          materialType,
          rate: numericRate,
        });
      }
    }

    if (ratesToSave.length === 0) {
      toast.error('Please enter at least one rate');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await assignApi.setLocationRates(
        selectedLocation._id,
        ratesToSave
      );
      if (response.success) {
        toast.success(`Successfully saved ${ratesToSave.length} rate(s)`);
        setHasChanges(false);
        setLastSaved(new Date());
        // Reload rates to get updated data
        await loadRates(selectedLocation._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rates');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate statistics
  const getRateStatistics = () => {
    const ratesArray = Object.values(rates).filter(r => r !== '' && r !== null);
    const numericRates = ratesArray.map(r => parseFloat(r.replace(/₹\s*/g, '').trim())).filter(r => !isNaN(r));
    const totalRates = materialTypes.length;
    const configuredRates = numericRates.length;
    
    if (numericRates.length === 0) {
      return { configured: 0, total: totalRates, average: 0, min: 0, max: 0 };
    }

    return {
      configured: configuredRates,
      total: totalRates,
      average: numericRates.reduce((a, b) => a + b, 0) / numericRates.length,
      min: Math.min(...numericRates),
      max: Math.max(...numericRates),
    };
  };

  const hasRateChanged = (materialType) => {
    return rates[materialType] !== originalRates[materialType];
  };

  const _formatCurrency = (value) => {
    if (!value || value === '') return '';
    const num = parseFloat(value.replace(/₹\s*/g, '').trim());
    if (isNaN(num)) return value;
    return `₹ ${num.toFixed(2)}`;
  };

  const stats = getRateStatistics();
  const changedCount = materialTypes.filter(mt => hasRateChanged(mt)).length;

  // Early return if MATERIAL_TYPES is not available
  if (materialTypes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Configuration Error
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Material types are not configured. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={formRef}>
      {/* Location Selector Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Location
          </label>
          {selectedLocation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLocation(null);
                setHasChanges(false);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <LocationAutocomplete
          value={selectedLocation?._id || ''}
          onChange={(_locationId) => {
            // Handle change if needed
          }}
          onLocationSelect={(location) => {
            if (hasChanges) {
              if (confirm('You have unsaved changes. Do you want to discard them?')) {
                setSelectedLocation(location);
                setHasChanges(false);
              }
            } else {
              setSelectedLocation(location);
            }
          }}
          placeholder="Search for a location to set material rates..."
        />
        {selectedLocation && (
          <div className="mt-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedLocation.locationName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedLocation.address}
                    {selectedLocation.city && `, ${selectedLocation.city}`}
                  </div>
                  {stats.configured > 0 && (
                    <div className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                      {stats.configured} of {stats.total} material rates configured
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {selectedLocation && !loading && stats.configured > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rates Configured</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.configured}/{stats.total}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Average Rate</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹ {stats.average.toFixed(2)}/kg
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Range</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹ {stats.min.toFixed(2)} - ₹ {stats.max.toFixed(2)}
              </div>
            </div>
            {lastSaved && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Last Saved</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {lastSaved.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedLocation && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openCopyModal(null)}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy from Location
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSetDefaults}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Set Defaults
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetAll}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset All
            </Button>
            <div className="flex-1"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rates Form */}
      {selectedLocation ? (
        loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Skeleton variant="text" width="200px" height="1.5rem" />
              <Skeleton variant="text" width="400px" height="1rem" className="mt-2" />
            </div>
            <div className="p-6">
              <Skeleton variant="text" lines={6} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Collection Item Type Rates
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Set default rates per kg for each material type at this location. These rates will be used when creating new collections.
                </p>
              </div>
              <div className="p-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(materialTypes || []).map((materialType) => {
                      const hasChanged = hasRateChanged(materialType);
                      const hasValue = rates[materialType] && rates[materialType] !== '';
                      return (
                        <div key={materialType} className="relative">
                          <div className="relative">
                            <span className="absolute left-3 top-[2.1rem] text-gray-500 dark:text-gray-400 font-medium z-10">
                              ₹
                            </span>
                            <FormInput
                              label={MATERIAL_TYPE_LABELS[materialType]}
                              type="number"
                              name={`rate_${materialType}`}
                              value={rates[materialType] || ''}
                              onChange={(e) => handleRateChange(materialType, e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              helperText={`Rate for ${MATERIAL_TYPE_LABELS[materialType]} (per kg)`}
                              className={hasChanged ? 'ring-2 ring-orange-200 dark:ring-orange-800' : ''}
                              style={{ paddingLeft: '2rem' }}
                            />
                          </div>
                          {hasChanged && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                          {hasValue && !hasChanged && (
                            <div className="absolute top-0 right-0 mt-2 mr-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Material Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Rate (₹/kg)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {(materialTypes || []).map((materialType) => {
                          const hasChanged = hasRateChanged(materialType);
                          const hasValue = rates[materialType] && rates[materialType] !== '';
                          const defaultRates = {
                            [MATERIAL_TYPES.MIXED_PLASTIC]: '18.00',
                            [MATERIAL_TYPES.PAPER]: '5.00',
                            [MATERIAL_TYPES.IRON]: '18.00',
                            [MATERIAL_TYPES.ALUMINIUM]: '18.00',
                            [MATERIAL_TYPES.WOOD]: '5.00',
                            [MATERIAL_TYPES.COPPER]: '18.00',
                          };
                          const defaultValue = defaultRates[materialType];
                          return (
                            <tr
                              key={materialType}
                              className={hasChanged ? 'bg-orange-50 dark:bg-orange-900/10' : ''}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {MATERIAL_TYPE_LABELS[materialType]}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    value={rates[materialType] || ''}
                                    onChange={(e) => handleRateChange(materialType, e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                      hasChanged
                                        ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
                                        : 'border-gray-300 dark:border-gray-600'
                                    } dark:bg-gray-700 dark:text-white`}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {hasValue ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Set
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                    Empty
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {hasValue ? (
                                  <button
                                    onClick={() => handleRateChange(materialType, '')}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Clear
                                  </button>
                                ) : defaultValue ? (
                                  <button
                                    onClick={() => handleRateChange(materialType, defaultValue)}
                                    className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                                  >
                                    Set Default
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button Area */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-4">
                {hasChanges && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {changedCount} rate{changedCount !== 1 ? 's' : ''} will be updated
                  </div>
                )}
                {hasChanges && (
                  <Button
                    variant="secondary"
                    onClick={handleCancelChanges}
                    disabled={isSubmitting}
                  >
                    Cancel Changes
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Press Ctrl+S to save
                  </span>
                )}
                <Button
                  variant="primary"
                  onClick={handleSaveRates}
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !hasChanges}
                  className={hasChanges ? '' : 'opacity-50'}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Rates
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <EmptyState
            icon={DollarSign}
            title="Select a location"
            description="Please select a location above to view and set material rates"
          />
        </div>
      )}

      {/* Info Message */}
      {selectedLocation && !loading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                About Material Rates
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                These rates are used as defaults when creating new collections for this location. You can still override them when creating individual collections.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Copy Rates Modal */}
      <Modal
        isOpen={showCopyModal}
        onClose={closeCopyModal}
        title="Copy Rates from Location"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Source Location
            </label>
            <LocationAutocomplete
              value={copySourceLocation?._id || ''}
              onChange={(_locationId) => {
                // Handle change if needed
              }}
              onLocationSelect={(location) => {
                openCopyModal(location);
              }}
              placeholder="Search for a location to copy rates from..."
            />
            {copySourceLocation && (
              <div className="mt-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {copySourceLocation.locationName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {copySourceLocation.address}
                      {copySourceLocation.city && `, ${copySourceLocation.city}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={closeCopyModal}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCopyFromLocation}
              disabled={!copySourceLocation}
            >
              Copy Rates
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LocationRatesTab;
