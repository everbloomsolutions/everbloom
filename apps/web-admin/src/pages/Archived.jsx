import ErrorBoundary from '../components/shared/ErrorBoundary';
import { archivedApi } from '../api';
import { Archive, RotateCcw, Trash2, Package, MapPin, Users } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Table from '../components/data/Table';
import Pagination from '../components/shared/Pagination';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import logger from '../utils/logger';
import { toast } from 'react-hot-toast';
import { getLocationTypeLabel } from '../types/collections';
import { useModal, useModalWithData } from '../hooks';
import { createQueryFn } from '../utils/queryAdapter';

/**
 * Archived Page - Review and manage deleted items
 * Admin only - Shows deleted Collections, Locations, and Users
 */
const Archived = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Parse filters from URL
  const filters = useMemo(() => ({
    tab: searchParams.get('tab') || 'collections',
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams]);

  // Modal states using useModal hooks
  const { isOpen: showDeleteConfirm, open: openDeleteConfirm, close: closeDeleteConfirm } = useModal();
  const { data: deleteConfirmData, openWithData: openDeleteConfirmWithData } = useModalWithData({
    onClose: () => {
      closeDeleteConfirm();
    },
  });

  // Loading states for restore/delete operations (not needed - using mutation isPending)
  // Removed useLoadingStates as mutations handle loading state

  // Build query params for API call
  const queryParams = useMemo(() => {
    return {
      page: filters.page,
      limit: 10,
    };
  }, [filters.page]);

  // Use TanStack Query for data fetching - conditional based on active tab
  const collectionsQuery = useQuery({
    queryKey: ['archived', 'collections', filters.page],
    queryFn: createQueryFn(() => archivedApi.getDeletedCollections(queryParams)),
    enabled: filters.tab === 'collections',
    staleTime: 30000, // 30 seconds
  });

  const locationsQuery = useQuery({
    queryKey: ['archived', 'locations', filters.page],
    queryFn: createQueryFn(() => archivedApi.getDeletedLocations(queryParams)),
    enabled: filters.tab === 'locations',
    staleTime: 30000,
  });

  const usersQuery = useQuery({
    queryKey: ['archived', 'users', filters.page],
    queryFn: createQueryFn(() => archivedApi.getDeletedUsers(queryParams)),
    enabled: filters.tab === 'users',
    staleTime: 30000,
  });

  // Get active query based on tab
  const activeQuery = useMemo(() => {
    switch (filters.tab) {
      case 'collections':
        return collectionsQuery;
      case 'locations':
        return locationsQuery;
      case 'users':
        return usersQuery;
      default:
        return collectionsQuery;
    }
  }, [filters.tab, collectionsQuery, locationsQuery, usersQuery]);

  // Extract data from active query
  const data = useMemo(() => activeQuery.data || {}, [activeQuery.data]);
  const items = useMemo(() => {
    switch (filters.tab) {
      case 'collections':
        return data.projects || [];
      case 'locations':
        return data.locations || [];
      case 'users':
        return data.users || [];
      default:
        return [];
    }
  }, [filters.tab, data]);

  const totalPages = data.totalPages || 1;
  const loading = activeQuery.isLoading;

  // Mutations for restore and delete operations
  const restoreMutation = useMutation({
    mutationFn: ({ id, type }) => {
      switch (type) {
        case 'collection':
          return archivedApi.restoreCollection(id);
        case 'location':
          return archivedApi.restoreLocation(id);
        case 'user':
          return archivedApi.restoreUser(id);
        default:
          throw new Error(`Unknown type: ${type}`);
      }
    },
    onSuccess: (_, variables) => {
      const typeLabel = variables.type.charAt(0).toUpperCase() + variables.type.slice(1);
      toast.success(`${typeLabel} restored successfully`);
      queryClient.invalidateQueries({ queryKey: ['archived', `${variables.type}s`] });
      queryClient.invalidateQueries({ queryKey: ['archived'] });
      queryClient.invalidateQueries({ queryKey: [`${variables.type}s`] });
    },
    onError: (error, variables) => {
      logger.error(`Failed to restore ${variables.type}:`, error);
      toast.error(error.response?.data?.message || `Failed to restore ${variables.type}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }) => {
      switch (type) {
        case 'collection':
          return archivedApi.permanentlyDeleteCollection(id);
        case 'location':
          return archivedApi.permanentlyDeleteLocation(id);
        case 'user':
          return archivedApi.permanentlyDeleteUser(id);
        default:
          throw new Error(`Unknown type: ${type}`);
      }
    },
    onSuccess: (_, variables) => {
      const typeLabel = variables.type.charAt(0).toUpperCase() + variables.type.slice(1);
      toast.success(`${typeLabel} permanently deleted`);
      queryClient.invalidateQueries({ queryKey: ['archived', `${variables.type}s`] });
      queryClient.invalidateQueries({ queryKey: ['archived'] });
      queryClient.invalidateQueries({ queryKey: [`${variables.type}s`] });
      closeDeleteConfirm();
    },
    onError: (error, variables) => {
      logger.error(`Failed to permanently delete ${variables.type}:`, error);
      toast.error(error.response?.data?.message || `Failed to permanently delete ${variables.type}`);
    },
  });

  // Handlers
  const handleRestore = useCallback((id, type) => {
    restoreMutation.mutate({ id, type });
  }, [restoreMutation]);

  const handlePermanentDelete = useCallback((id, type, name, collectionCount) => {
    // Prevent deletion if item has collections
    if (collectionCount > 0) {
      toast.error(`Cannot permanently delete ${type} with associated collections. Only soft delete or deactivation is allowed.`);
      return;
    }
    openDeleteConfirm();
    openDeleteConfirmWithData({ id, type, name });
  }, [openDeleteConfirm, openDeleteConfirmWithData]);

  const confirmPermanentDelete = useCallback(() => {
    if (!deleteConfirmData) return;
    const { id, type } = deleteConfirmData;
    deleteMutation.mutate({ id, type });
  }, [deleteConfirmData, deleteMutation]);

  // Filter handlers with URL persistence
  const handleTabChange = useCallback((tab) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      newParams.set('page', '1'); // Reset to first page when tab changes
      return newParams;
    });
  }, [setSearchParams]);


  const setPage = useCallback((page) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    });
  }, [setSearchParams]);


  // Get counts for tabs (from cached queries)
  const collectionsCount = collectionsQuery.data?.projects?.length || 0;
  const locationsCount = locationsQuery.data?.locations?.length || 0;
  const usersCount = usersQuery.data?.users?.length || 0;


  // Collections columns
  const collectionColumns = [
    {
      key: 'receiptNumber',
      label: 'Receipt #',
      render: (receiptNumber) => (
        <span className="text-gray-900 dark:text-white font-mono text-sm">
          {receiptNumber || '-'}
        </span>
      ),
    },
    {
      key: 'locationName',
      label: 'Location Name',
      render: (name) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {name || '-'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      render: (amount) => (
        <span className="text-gray-900 dark:text-white font-semibold">
          {amount ? formatCurrency(amount, { maximumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    {
      key: 'collectionDate',
      label: 'Collection Date',
      render: (date) => date ? formatDate(date, 'PP') : '-',
    },
    {
      key: 'deletedAt',
      label: 'Deleted At',
      render: (date) => (
        <span className="text-red-600 dark:text-red-400 font-medium">
          {date ? formatDate(date, 'PP') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, collection) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleRestore(collection._id, 'collection')}
            disabled={restoreMutation.isPending || deleteMutation.isPending}
            className="p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restore Collection"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePermanentDelete(collection._id, 'collection', collection.locationName || collection.receiptNumber, 0)}
            disabled={restoreMutation.isPending || deleteMutation.isPending}
            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Permanently Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Locations columns
  const locationColumns = [
    {
      key: 'locationName',
      label: 'Location Name',
      render: (name) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {name || '-'}
        </span>
      ),
    },
    {
      key: 'locationType',
      label: 'Location Type',
      render: (type) => (
        <span className="text-gray-900 dark:text-white capitalize">
          {type ? getLocationTypeLabel(type) : '-'}
        </span>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      render: (address) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {address || '-'}
        </span>
      ),
    },
    {
      key: 'city',
      label: 'City',
      render: (city) => (
        <span className="text-gray-600 dark:text-gray-400">
          {city || '-'}
        </span>
      ),
    },
    {
      key: 'usageCount',
      label: 'Usage Count',
      render: (count) => (
        <span className="text-gray-900 dark:text-white">
          {count || 0}
        </span>
      ),
    },
    {
      key: 'deletedAt',
      label: 'Deleted At',
      render: (date) => (
        <span className="text-red-600 dark:text-red-400 font-medium">
          {date ? formatDate(date, 'PP') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, location) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleRestore(location._id, 'location')}
            disabled={restoreMutation.isPending || deleteMutation.isPending}
            className="p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restore Location"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePermanentDelete(location._id, 'location', location.locationName, location.collectionCount || 0)}
            disabled={restoreMutation.isPending || deleteMutation.isPending || (location.collectionCount > 0)}
            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={location.collectionCount > 0 ? "Cannot delete location with collections" : "Permanently Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Users columns
  const userColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (name) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {name || '-'}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (email) => (
        <span className="text-gray-900 dark:text-white">
          {email || '-'}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (role) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          role === 'admin' 
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
            : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
        }`}>
          {role || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (date) => date ? formatDate(date, 'PP') : '-',
    },
    {
      key: 'deletedAt',
      label: 'Deleted At',
      render: (date) => (
        <span className="text-red-600 dark:text-red-400 font-medium">
          {date ? formatDate(date, 'PP') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleRestore(user._id, 'user')}
            disabled={restoreMutation.isPending || deleteMutation.isPending}
            className="p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restore User"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePermanentDelete(user._id, 'user', user.name || user.email, user.collectionCount || 0)}
            disabled={restoreMutation.isPending || deleteMutation.isPending || (user.collectionCount > 0)}
            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={user.collectionCount > 0 ? "Cannot delete user with collections" : "Permanently Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Get current columns based on active tab
  const getCurrentColumns = useMemo(() => {
    switch (filters.tab) {
      case 'collections':
        return collectionColumns;
      case 'locations':
        return locationColumns;
      case 'users':
        return userColumns;
      default:
        return collectionColumns;
    }
  // intentional: column defs are stable by tab; including them would re-run every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.tab]);

  if (loading && items.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Archived</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Review and manage deleted Collections, Locations, and Users
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('collections')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                filters.tab === 'collections'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Collections ({collectionsCount})
              </div>
            </button>
            <button
              onClick={() => handleTabChange('locations')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                filters.tab === 'locations'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Locations ({locationsCount})
              </div>
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                filters.tab === 'users'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users ({usersCount})
              </div>
            </button>
          </nav>
        </div>
      </div>


      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {items.length === 0 && !loading ? (
          <EmptyState
            icon={Archive}
            title={`No deleted ${filters.tab} found`}
            description={
              filters.tab === 'collections' ? 'Deleted collections will appear here' :
              filters.tab === 'locations' ? 'Deleted locations will appear here' :
              'Deleted users will appear here'
            }
          />
        ) : (
          <Table columns={getCurrentColumns} data={items} />
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={filters.page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmPermanentDelete}
        title="Permanently Delete"
        message={deleteConfirmData ? `Are you sure you want to permanently delete this ${deleteConfirmData.type}? This action cannot be undone.\n\n${deleteConfirmData.type}: ${deleteConfirmData.name || deleteConfirmData.id}\n\nNote: ${deleteConfirmData.type === 'user' || deleteConfirmData.type === 'location' ? `${deleteConfirmData.type === 'user' ? 'Users' : 'Locations'} with collections cannot be permanently deleted and can only be soft deleted or deactivated.` : ''}` : ''}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const ArchivedWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Archived"
      message="Something went wrong while loading the archived page. Please try refreshing the page."
    >
      <Archived />
    </ErrorBoundary>
  );
};

export default ArchivedWithErrorBoundary;

