import { useState, useEffect } from 'react';
import { MapPin, Search, Edit, X, AlertCircle } from 'lucide-react';
import { assignApi } from '../../api';
import Table from '../data/Table';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import LocationAutocomplete from '../locations/LocationAutocomplete';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/formatDate';
import Pagination from '../shared/Pagination';
import Skeleton from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import { useModalWithData, useUsersWithLocations, useDebounce } from '../../hooks';

const LocationAssignmentTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  
  // Use TanStack Query hook for data fetching
  const { users, totalPages, loading, error, refetch } = useUsersWithLocations({
    page,
    limit: 10,
    search: debouncedSearch,
  });
  
  const { data: modalData, isOpen: isModalOpen, openWithData: openModal, close: closeModal } = useModalWithData({
    onClose: () => {
      // Reset selected location when modal closes
      setSelectedLocation(null);
    },
  });
  const selectedUser = modalData?.user || null;
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      setPage(1);
    }
  }, [debouncedSearch, searchQuery]);

  const handleAssignLocation = (user) => {
    if (!user || !user._id) {
      toast.error('Invalid user data');
      return;
    }
    openModal({ user });
    setSelectedLocation(user.defaultLocation || null);
  };

  const handleRemoveLocation = async (user) => {
    if (!user || !user._id) {
      toast.error('Invalid user data');
      return;
    }

    if (!confirm(`Remove default location from ${user.name || 'this user'}?`)) {
      return;
    }

    try {
      const response = await assignApi.removeUserLocation(user._id);
      if (response && response.success) {
        toast.success('Location removed successfully');
        refetch();
      } else {
        toast.error(response?.message || 'Failed to remove location');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove location';
      toast.error(errorMessage);
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedUser || !selectedUser._id) {
      toast.error('Invalid user data');
      return;
    }

    if (!selectedLocation || !selectedLocation._id) {
      toast.error('Please select a location');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await assignApi.assignUserLocation(
        selectedUser._id,
        selectedLocation._id
      );
      if (response && response.success) {
        toast.success('Location assigned successfully');
        closeModal();
        setSelectedLocation(null);
        refetch();
      } else {
        toast.error(response?.message || 'Failed to assign location');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign location';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (name, user) => name || user?.email || 'Unknown',
    },
    { 
      key: 'email', 
      label: 'Email',
      render: (email) => email || '-',
    },
    {
      key: 'defaultLocation',
      label: 'Default Location',
      render: (location, user) => {
        if (!user) return <span className="text-sm text-gray-400 dark:text-gray-500">-</span>;
        
        if (location && typeof location === 'object' && location.locationName) {
          return (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span
                className="truncate max-w-[200px]"
                title={`${location.locationName}${location.address ? ` - ${location.address}` : ''}`}
              >
                {location.locationName}
              </span>
            </div>
          );
        }
        return (
          <span className="text-sm text-red-500 dark:text-red-400 italic flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            No location assigned
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (date) => date ? formatDate(date, 'PP') : '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => {
        if (!user) return null;
        return (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAssignLocation(user)}
            >
              <Edit className="w-4 h-4 mr-1" />
              {user.defaultLocation ? 'Change' : 'Assign'}
            </Button>
            {user.defaultLocation && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRemoveLocation(user)}
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users without location warning */}
      {users.filter(u => !u.defaultLocation).length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {users.filter(u => !u.defaultLocation).length} user(s) without default location
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Users need a default location to access collections. Please assign locations to these users.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Users ({users.length})
            </h2>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <Skeleton variant="table" lines={5} />
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error Loading Users
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error?.message || error}</p>
              <Button variant="primary" onClick={refetch}>
                Try Again
              </Button>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No users found"
              description={debouncedSearch ? 'Try adjusting your search query' : 'No users with role "user" found'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table columns={columns} data={users} />
              </div>
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assign Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          closeModal();
          setSelectedLocation(null);
        }}
        title={selectedUser ? `Assign Location to ${selectedUser.name || 'User'}` : 'Assign Location'}
        size="md"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Location
              </label>
              <LocationAutocomplete
                value={selectedLocation?._id || ''}
                onChange={(_locationId) => {
                  // Handle change if needed
                }}
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                }}
                placeholder="Search for a location..."
              />
              {selectedLocation && (
                <div className="mt-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedLocation.locationName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedLocation.address}
                        {selectedLocation.city && `, ${selectedLocation.city}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  closeModal();
                  setSelectedLocation(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveLocation}
                isLoading={isSubmitting}
                disabled={isSubmitting || !selectedLocation}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LocationAssignmentTab;
