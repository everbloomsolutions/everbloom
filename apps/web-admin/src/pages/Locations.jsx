import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { locationApi } from '../api';
import { MapPin, Plus, Download, Upload } from 'lucide-react';
import Pagination from '../components/shared/Pagination';
import Button from '../components/shared/Button';
import LocationModal from '../components/locations/LocationModal';
import LocationDetailsModal from '../components/locations/LocationDetailsModal';
import LocationImport from '../components/locations/LocationImport';
import LocationsFilters from '../components/locations/LocationsFilters';
import LocationsTable from '../components/locations/LocationsTable';
import LocationBulkActions from '../components/locations/LocationBulkActions';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import Loader from '../components/shared/Loader';
import { useDebounce, useLocations, useLocationFilters, useLoadingStates, useModal, useModalWithData } from '../hooks';
import { toast } from 'react-hot-toast';
import logger from '../utils/logger';
import { queryClient } from '../providers/QueryProvider';

const Locations = () => {
  // Use custom hooks for filters and loading states
  const { filters, updateFilter, clearFilters, setPage } = useLocationFilters({
    limit: 20,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Update filter when debounced search changes (only if different)
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilter('search', debouncedSearch);
    }
    // Remove updateFilter and filters.search from deps to prevent loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Modal states using useModal hook
  const { isOpen: isCreateModalOpen, open: openCreateModal, close: closeCreateModal } = useModal();
  const { isOpen: showImportModal, open: openImportModal, close: closeImportModal } = useModal();
  const { isOpen: showDeleteConfirm, open: openDeleteConfirm, close: closeDeleteConfirm } = useModal();
  const { isOpen: showBulkDeleteConfirm, open: openBulkDeleteConfirm, close: closeBulkDeleteConfirm } = useModal();

  // Modal data states using useModalWithData hooks
  const { data: editingLocation, openWithData: openEditModalWithData, close: closeEditModalData } = useModalWithData({
    onClose: () => {
      closeCreateModal();
    },
  });
  const { data: viewingLocationId, openWithData: openViewModalWithData, close: closeViewModalData } = useModalWithData();
  const { data: deleteLocationData, openWithData: openDeleteConfirmWithData, close: closeDeleteConfirmData } = useModalWithData({
    onClose: () => {
      closeDeleteConfirm();
    },
  });

  // Other UI states
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');


  // Use granular loading states
  const { isLoading, setLoading } = useLoadingStates(['exporting']);

  // Memoize filters object to prevent unnecessary re-renders
  const locationFilters = useMemo(() => ({
    page: filters.page,
    limit: filters.limit,
    search: debouncedSearch,
    locationType: filters.locationType,
    status: filters.status,
    city: filters.city,
    state: filters.state,
    minUsageCount: filters.minUsageCount,
    maxUsageCount: filters.maxUsageCount,
    neverUsed: filters.neverUsed,
    sortBy: filters.sortBy,
  }), [
    filters.page,
    filters.limit,
    debouncedSearch,
    filters.locationType,
    filters.status,
    filters.city,
    filters.state,
    filters.minUsageCount,
    filters.maxUsageCount,
    filters.neverUsed,
    filters.sortBy,
  ]);

  // Use custom hook for locations data fetching
  const { locations, totalPages, total: totalLocations, loading, error, refetch: refetchLocations } = useLocations(locationFilters);

  // Wrapper for refetch that can be used in callbacks
  const fetchLocations = useCallback(() => {
    refetchLocations();
  }, [refetchLocations]);


  // Locations are automatically fetched via useQuery when queryParams change
  // No need for manual useEffect

  const handleSearch = useCallback((searchTerm) => {
    setSearchQuery(searchTerm);
    // Page will be reset automatically by updateFilter when search changes
  }, []);

  const handleLocationCreated = useCallback(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleEdit = useCallback((location) => {
    openEditModalWithData(location);
    openCreateModal();
  }, [openCreateModal, openEditModalWithData]);

  const handleDelete = useCallback((locationId, _locationName) => {
    openDeleteConfirmWithData({ locationId, locationName: _locationName });
    openDeleteConfirm();
  }, [openDeleteConfirm, openDeleteConfirmWithData]);

  const confirmDelete = async () => {
    if (!deleteLocationData) return;
    const { locationId, locationName: _locationName } = deleteLocationData;

    try {
      const response = await locationApi.deleteLocation(locationId);
      if (response.success) {
        toast.success('Location deleted successfully');
        fetchLocations();
        queryClient.invalidateQueries({ queryKey: ['archived', 'locations'] });
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        toast('Location already removed or archived');
        fetchLocations();
        queryClient.invalidateQueries({ queryKey: ['archived', 'locations'] });
      } else {
        logger.error('Failed to delete location:', error);
        const errorMessage = error?.response?.data?.message || 'Failed to delete location';
        toast.error(errorMessage);
      }
    } finally {
      closeDeleteConfirm();
      closeDeleteConfirmData();
    }
  };

  const handleToggleStatus = useCallback(async (locationId, currentStatus, _locationName) => {
    try {
      const newStatus = !currentStatus;
      const response = await locationApi.updateLocation(locationId, { isActive: newStatus });
      if (response.success) {
        toast.success(`Location ${newStatus ? 'activated' : 'deactivated'} successfully`);
        fetchLocations(); // Refetch to get updated data
      }
    } catch (error) {
      logger.error('Failed to toggle location status:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to update location status';
      toast.error(errorMessage);
    }
  }, [fetchLocations]);

  const handleExportLocations = async () => {
    try {
      setLoading('exporting', true);
      const params = {
        format: exportFormat,
      };
      if (filters.locationType !== 'all') params.locationType = filters.locationType;
      if (filters.status !== 'all') params.isActive = filters.status === 'active';
      if (filters.city) params.city = filters.city;
      if (filters.state) params.state = filters.state;
      if (debouncedSearch) params.search = debouncedSearch;

      toast.loading('Exporting locations...', { id: 'export-locations' });
      const blob = await locationApi.exportLocations(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = exportFormat === 'xlsx' ? '.xlsx' : '.csv';
      a.download = `locations-export-${new Date().toISOString().split('T')[0]}${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Locations exported as ${exportFormat.toUpperCase()} successfully`, { id: 'export-locations' });
    } catch (error) {
      logger.error('Failed to export locations:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to export locations';
      toast.error(errorMessage, { id: 'export-locations' });
    } finally {
      setLoading('exporting', false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select locations to delete');
      return;
    }

    // Filter out locations with usage
    const locationsWithUsage = (locations || []).filter(loc =>
      selectedLocations.includes(loc._id) && (loc.usageCount || 0) > 0
    );
    const locationsWithoutUsage = selectedLocations.filter(id => {
      const loc = (locations || []).find(l => l._id === id);
      return loc && (loc.usageCount || 0) === 0;
    });

    if (locationsWithUsage.length > 0) {
      toast.error(
        `${locationsWithUsage.length} location(s) have usage and cannot be deleted. Only locations with 0 usage can be deleted.`,
        { duration: 5000 }
      );
      if (locationsWithoutUsage.length === 0) {
        return; // No locations can be deleted
      }
    }

    // Only proceed with locations that have no usage
    if (locationsWithoutUsage.length < selectedLocations.length) {
      setSelectedLocations(locationsWithoutUsage);
      toast.info(`Proceeding with ${locationsWithoutUsage.length} location(s) that can be deleted`);
    }

    openBulkDeleteConfirm();
  };

  const confirmBulkDelete = async () => {
    try {
      const response = await locationApi.bulkDeleteLocations(selectedLocations);
      if (response.success) {
        toast.success(`Deleted ${response.data.success} location(s)`);
        setSelectedLocations([]);
        fetchLocations();
      }
    } catch (error) {
      logger.error('Failed to bulk delete locations:', error);
      toast.error('Failed to delete locations');
    } finally {
      closeBulkDeleteConfirm();
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedLocations.length === 0) {
      toast.error('Please select locations to deactivate');
      return;
    }

    try {
      const updates = selectedLocations.map(id => ({ id, data: { isActive: false } }));
      const response = await locationApi.bulkUpdateLocations(updates);
      if (response.success) {
        toast.success(`Deactivated ${response.data.success} location(s)`);
        setSelectedLocations([]);
        fetchLocations();
      }
    } catch (error) {
      logger.error('Failed to bulk deactivate locations:', error);
      toast.error('Failed to deactivate locations');
    }
  };

  const handleSelectLocation = useCallback((locationId, checked) => {
    if (checked) {
      setSelectedLocations(prev => [...prev, locationId]);
    } else {
      setSelectedLocations(prev => prev.filter(id => id !== locationId));
    }
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedLocations((locations || []).map(loc => loc._id));
    } else {
      setSelectedLocations([]);
    }
  }, [locations]);


  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Locations</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage registered locations for collections
            {totalLocations > 0 && (
              <span className="ml-2 text-gray-600 dark:text-gray-300">
                ({totalLocations} {totalLocations === 1 ? 'location' : 'locations'})
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={openImportModal}
            variant="secondary"
            icon={Upload}
            className="flex-shrink-0"
          >
            Import
          </Button>
          <div className="flex items-center gap-0 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex-shrink-0">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 border-0 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer h-full"
              title="Select export format"
              disabled={isLoading('exporting')}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
            </select>
            <Button
              onClick={handleExportLocations}
              variant="secondary"
              size="sm"
              className="rounded-l-none border-l border-gray-300 dark:border-gray-600 flex-shrink-0"
              title={`Export locations as ${exportFormat.toUpperCase()}`}
              icon={Download}
              isLoading={isLoading('exporting')}
              loadingText="Exporting..."
              disabled={isLoading('exporting')}
            >
              Export
            </Button>
          </div>
          <Button
            onClick={() => {
              closeEditModalData();
              openCreateModal();
            }}
            variant="primary"
            icon={Plus}
            className="flex-shrink-0"
          >
            Create Location
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LocationsFilters
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        onSearch={handleSearch}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={setShowAdvancedFilters}
      />

      {/* Bulk Actions Bar */}
      <LocationBulkActions
        selectedCount={selectedLocations.length}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedLocations([])}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8">
            <Loader />
          </div>
        ) : (locations || []).length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {debouncedSearch || filters.locationType !== 'all' || filters.status !== 'all' || filters.city || filters.state
                ? 'No locations match your filters'
                : 'No locations found'}
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error loading locations: {error.response?.data?.message || error.message || 'Unknown error'}
                </p>
              </div>
            )}
            {(debouncedSearch || filters.locationType !== 'all' || filters.status !== 'all' || filters.city || filters.state) && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  clearFilters();
                }}
                variant="secondary"
                className="mb-3"
              >
                Clear Filters
              </Button>
            )}
            <Button
              onClick={() => {
                closeEditModalData();
                openCreateModal();
              }}
              variant="primary"
              icon={Plus}
            >
              Create First Location
            </Button>
          </div>
        ) : (
          <>
            <LocationsTable
              locations={locations}
              selectedLocations={selectedLocations}
              onSelectLocation={handleSelectLocation}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onViewDetails={openViewModalWithData}
            />
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={filters.page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <LocationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          closeCreateModal();
          closeEditModalData();
        }}
        onSuccess={handleLocationCreated}
        location={editingLocation}
      />

      <LocationDetailsModal
        isOpen={!!viewingLocationId}
        onClose={closeViewModalData}
        locationId={viewingLocationId}
        onEdit={(location) => {
          closeViewModalData();
          openEditModalWithData(location);
          openCreateModal();
        }}
        onDeactivate={(location) => {
          handleToggleStatus(location._id, location.isActive, location.locationName);
        }}
      />

      {/* Import Modal */}
      <LocationImport
        isOpen={showImportModal}
        onClose={closeImportModal}
        onImportComplete={fetchLocations}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          closeDeleteConfirm();
          closeDeleteConfirmData();
        }}
        onConfirm={confirmDelete}
        title="Delete Location"
        message={deleteLocationData ? `Are you sure you want to delete location "${deleteLocationData.locationName}"? This action cannot be undone.` : 'Are you sure you want to delete this location? This action cannot be undone.'}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={closeBulkDeleteConfirm}
        onConfirm={confirmBulkDelete}
        title="Delete Locations"
        message={`Are you sure you want to delete ${selectedLocations.length} location(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const LocationsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Locations"
      message="Something went wrong while loading the locations page. Please try refreshing the page."
    >
      <Locations />
    </ErrorBoundary>
  );
};

export default LocationsWithErrorBoundary;

