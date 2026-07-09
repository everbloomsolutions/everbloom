import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { collectionApi, userApi } from '../api';
import { Plus, Download, Upload, UserCog } from 'lucide-react';
import Pagination from '../components/shared/Pagination';
import Skeleton from '../components/shared/Skeleton';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import Button from '../components/shared/Button';
import { useDebounce, useCollectionFilters, useCollections, useCollectionActions, useAuth, useForm, useModal, useModalWithData, useCollectionUIState, useCollectionLocationState } from '../hooks';
import logger from '../utils/logger';
import { toast } from 'react-hot-toast';
import { COLLECTION_LOCATION_TYPES } from '../types/collections';
import LocationModal from '../components/locations/LocationModal';
import CollectionFilters from '../components/collections/CollectionFilters';
import CollectionTable from '../components/collections/CollectionTable';
import CollectionForm from '../components/collections/CollectionForm';
import CollectionImport from '../components/collections/CollectionImport';
import ReceiptGenerationModal from '../components/collections/ReceiptGenerationModal';
import { isAdmin } from '../utils/permissionUtils';
import { USER_ROLES } from '../utils/constants';

/**
 * Collections Page - Manage recycling collections
 * 
 * Features:
 * - Create collections with location type (Apartment/Society/Gated Community)
 * - Add collection items (Mixed Plastic, Paper, Iron) with weights and rates
 * - Auto-calculate totals and GST (18%)
 * - Generate receipts with GST
 */
const Collections = () => {
  const { user } = useAuth();
  
  // Use custom hooks for filters and data fetching
  const { filters, updateFilter, clearFilters, setPage } = useCollectionFilters({
    limit: 10,
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search by 300ms
  
  // Update filter when debounced search changes
  useEffect(() => {
    updateFilter('search', debouncedSearchQuery);
  }, [debouncedSearchQuery, updateFilter]);
  
  // UI state using custom hook
  const {
    showAdvancedFilters,
    toggleAdvancedFilters,
    exportFormat,
    setExportFormat,
    timePeriod,
    setTimePeriod,
  } = useCollectionUIState();
  
  // Location state using custom hook
  const {
    useExistingLocation,
    setUseExistingLocation,
    selectedLocationId,
    setSelectedLocationId,
    selectedLocationData,
    setSelectedLocationData,
    fetchLocationData,
    resetLocationState,
  } = useCollectionLocationState(user);
  
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  // Form state using useForm hook
  const collectionForm = useForm({
    locationType: COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    locationName: '',
    locality: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    collectionItems: [
      { materialType: 'mixed-plastic', weight: '', rate: '' },
    ],
    gstRate: 18,
    collectionDate: new Date().toISOString().split('T')[0],
  });
  
  // Expose formData and setFormData for CollectionForm compatibility
  const formData = collectionForm.values;
  const setFormData = useCallback((updater) => {
    if (typeof updater === 'function') {
      const newValues = updater(collectionForm.values);
      collectionForm.setValues(newValues);
    } else {
      collectionForm.setValues(updater);
    }
  }, [collectionForm]);

  // Modal states using useModal hooks
  const { isOpen: showCreateModal, open: openCreateModal, close: closeCreateModal } = useModal();
  const { isOpen: showLocationModal, open: openLocationModal, close: closeLocationModal } = useModal();
  const { isOpen: showImportModal, open: openImportModal, close: closeImportModal } = useModal();
  const { isOpen: showDeleteConfirm, open: openDeleteConfirm, close: closeDeleteConfirm } = useModal();
  const { isOpen: showTransferModal, open: openTransferModal, close: closeTransferModal } = useModal();
  const { isOpen: showReceiptModal, open: openReceiptModal, close: closeReceiptModal } = useModal();
  const { isOpen: showArchiveDuplicatesConfirm, open: openArchiveDuplicatesConfirm, close: closeArchiveDuplicatesConfirm } = useModal();
  const { isOpen: showArchiveDuplicatesApplyConfirm, open: openArchiveDuplicatesApplyConfirm, close: closeArchiveDuplicatesApplyConfirm } = useModal();
  
  // Modal data states using useModalWithData hooks
  const { data: deleteCollectionId, openWithData: openDeleteConfirmWithData, close: closeDeleteConfirmData } = useModalWithData({
    onClose: () => {
      closeDeleteConfirm();
    },
  });
  const { data: editingCollectionId, openWithData: openEditModalWithData, close: closeEditModalData } = useModalWithData({
    onClose: () => {
      closeCreateModal();
    },
  });
  const { data: transferringCollectionId, openWithData: openTransferModalWithData, close: closeTransferModalData } = useModalWithData({
    onClose: () => {
      closeTransferModal();
    },
  });
  const { data: receiptCollection, openWithData: openReceiptModalWithData, close: closeReceiptModalData } = useModalWithData({
    onClose: () => {
      closeReceiptModal();
    },
  });

  // Use custom hooks for collections data fetching and actions
  const { collections, totalPages, loading: collectionsLoading, refetch: refetchCollections, clearCache: clearCollectionsCache } = useCollections({
    ...filters,
    search: debouncedSearchQuery,
  });
  
  const { 
    deleteCollection: deleteCollectionAction, 
    generateReceipt: generateReceiptAction,
    transferCollection: transferCollectionAction,
    printReceipt: printReceiptAction,
    downloadReceipt: downloadReceiptAction,
    isDeleting: isDeletingFromHook,
    isGeneratingReceipt,
    isTransferring,
    isPrintingReceipt: _isPrintingReceipt,
    isDownloadingReceipt: _isDownloadingReceipt,
  } = useCollectionActions(refetchCollections);
  
  // Refetch collections when window gains focus (catches deletions in other tabs)
  useEffect(() => {
    const handleFocus = () => {
      logger.debug('Window focused, refetching collections');
      refetchCollections();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchCollections]);

  const runArchiveDuplicateCollections = useCallback(async (mode) => {
    try {
      const response = await collectionApi.archiveDuplicateCollections({ mode });
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to archive duplicate collections');
      }

      const totals = response?.data?.totals;
      if (totals) {
        toast.success(
          `Duplicate collections: ${mode}. Groups: ${totals.groups}, Candidates: ${totals.candidates}, Archived: ${totals.archived}, Skipped: ${totals.skipped}`,
          { duration: 7000 },
        );
      } else {
        toast.success(`Duplicate collections: ${mode} completed`);
      }

      refetchCollections();
      return response;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to archive duplicate collections';
      toast.error(errorMessage);
      throw error;
    }
  }, [refetchCollections]);
  
  // Debug logging for collections data
  useEffect(() => {
    if (collections.length > 0) {
      logger.debug('Collections data received:', {
        collectionsCount: collections.length,
        totalPages,
        userRole: user?.role,
      });
    }
  }, [collections, totalPages, user?.role]);

  const loading = collectionsLoading;

  // Wrapper for refetch that can be used in callbacks
  const fetchCollections = useCallback(() => {
    refetchCollections();
  }, [refetchCollections]);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await userApi.getAllUsers({ role: 'agent', limit: 100 });
      if (response.success && response.data) {
        const users = response.data.users || response.data || [];
        const activeAgents = users.filter(u => u.role === 'agent' && u.isActive !== false);
        setAgents(activeAgents);
      }
    } catch (error) {
      logger.error('Failed to fetch agents:', error);
      // Don't show error toast for filter agents, just log
    }
  }, []);

  // Collections are automatically fetched via useQuery when queryParams change
  // No need for manual useEffect

  // Fetch agents when transfer modal opens
  useEffect(() => {
    if (showTransferModal && isAdmin(user)) {
      fetchAgents();
    }
  }, [showTransferModal, user, fetchAgents]);

  // Fetch agents for filter (admin only)
  useEffect(() => {
    if (isAdmin(user) && filters.agentFilter === 'all') {
      fetchAgents();
    }
  }, [user, filters.agentFilter, fetchAgents]);

  // Note: Collection form logic (handleAddCollectionItem, calculateTotals, etc.) 
  // is now handled inside CollectionForm component

  // Handler for form submission (called by CollectionForm)
  const handleSubmitCollection = useCallback(async (collectionData, collectionId) => {
    let response;
    if (collectionId) {
      logger.info('Calling updateCollection API with payload:', {
        collectionId,
        payload: collectionData,
        userRole: user?.role,
      });
      response = await collectionApi.updateCollection(collectionId, collectionData);
      logger.info('updateCollection API response:', response);
    } else {
      logger.info('Calling createCollection API with payload:', collectionData);
      response = await collectionApi.createCollection(collectionData);
      logger.info('createCollection API response:', response);
    }
    
    // Handle both response formats
    const isSuccess = response?.success === true || (response && !response.error && !response.message);
    
    if (isSuccess) {
      if (collectionId) {
        toast.success('Collection updated successfully');
        closeEditModalData();
      } else {
        toast.success('Collection created successfully');
      }
      closeCreateModal();
      resetForm();
      
      // Clear cache and refetch to ensure fresh data
      if (clearCollectionsCache) {
        clearCollectionsCache();
      }
      refetchCollections();
    } else {
      const errorMsg = response?.message || response?.error || (collectionId ? 'Failed to update collection' : 'Failed to create collection');
      logger.error('Collection operation failed - response indicates failure:', response);
      throw new Error(errorMsg);
    }
  // intentional: modal/reset refs are stable; including them would re-create callback every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, clearCollectionsCache, refetchCollections]);

  // Wrapper for generate receipt - opens confirmation modal
  const handleGenerateReceipt = useCallback((collectionId) => {
    const collectionIdStr = collectionId?.toString() || String(collectionId);
    
    // Find collection in current list
    const collection = collections.find(c => {
      const cId = c._id?.toString() || String(c._id);
      return cId === collectionIdStr;
    });
    
    if (!collection) {
      toast.error('Collection not found. It may have been deleted. Refreshing list...', { duration: 5000 });
      refetchCollections();
      return;
    }
    
    if (collection.isDeleted || collection.deletedAt) {
      toast.error('This collection has been deleted. Refreshing list...', { duration: 5000 });
      refetchCollections();
      return;
    }
    
    // Open receipt generation modal with collection data
    openReceiptModalWithData(collection);
    openReceiptModal();
  }, [collections, refetchCollections, openReceiptModal, openReceiptModalWithData]);

  // Handle receipt generation confirmation
  const handleConfirmReceiptGeneration = useCallback(async (upiTransactionId) => {
    if (!receiptCollection) return;
    
    const collectionIdStr = receiptCollection._id?.toString() || String(receiptCollection._id);
    const result = await generateReceiptAction(collectionIdStr, upiTransactionId);
    
    if (result.success) {
      closeReceiptModal();
      closeReceiptModalData();
    }
  }, [receiptCollection, generateReceiptAction, closeReceiptModal, closeReceiptModalData]);

  // Use hook actions for print and download
  const handlePrintReceipt = useCallback(async (collectionId) => {
    await printReceiptAction(collectionId);
  }, [printReceiptAction]);

  const handleDownloadReceipt = useCallback(async (collectionId) => {
    await downloadReceiptAction(collectionId);
  }, [downloadReceiptAction]);

  const handleEditCollection = async (collection) => {
    try {
      // Check if collection is deleted before allowing edit
      if (collection.isDeleted || collection.deletedAt) {
        toast.error('This collection has been deleted. Refreshing list...', { duration: 5000 });
        refetchCollections();
        return;
      }
      
      // For agents, verify they can edit this collection
      // Agents can edit collections they created, collected, OR for locations assigned to them
      if (user?.role === USER_ROLES.AGENT) {
        // Handle userId and collectedBy as string or object (populated)
        const collectionUserId = collection.userId?._id || collection.userId?._id?.toString() || 
                                 (typeof collection.userId === 'string' ? collection.userId : null);
        const collectionCollectedBy = collection.collectedBy?._id || collection.collectedBy?._id?.toString() || 
                                      (typeof collection.collectedBy === 'string' ? collection.collectedBy : null);
        const currentUserId = user._id?.toString() || String(user._id);
        
        const isOwner = collectionUserId && (collectionUserId.toString() === currentUserId);
        const isCollector = collectionCollectedBy && (collectionCollectedBy.toString() === currentUserId);
        
        // Check if collection's location is assigned to this agent
        // Note: The backend will also verify this, but we do a quick check here for better UX
        // If the collection is visible to the agent (via getAllProjects filter), they should be able to edit it
        // The backend authorization will be the final check
        
        if (!isOwner && !isCollector) {
          // Don't block here - let backend handle the authorization check
          // The collection is already filtered by location assignment in getAllProjects
          // So if it's visible, the agent should be able to edit it
        }
      }
      
      // Set form data with collection data
      setFormData({
        locationType: collection.locationType || COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
        locationName: collection.locationName || '',
        locality: collection.location?.locality || '',
        address: collection.location?.address || '',
        city: collection.location?.city || '',
        state: collection.location?.state || '',
        zipCode: collection.location?.zipCode || '',
        collectionItems: collection.collectionItems?.map(item => ({
          materialType: item.materialType,
          weight: item.weight.toString(),
          rate: item.rate.toString(),
        })) || [{ materialType: 'mixed-plastic', weight: '', rate: '' }],
        gstRate: collection.gstRate || 18,
        collectionDate: collection.collectionDate ? new Date(collection.collectionDate).toISOString().split('T')[0] : '',
      });
      
      // Set location ID if exists and fetch location data
      // Handle locationId as string or object (populated)
      let locationId = null;
      if (collection.locationId) {
        if (typeof collection.locationId === 'string') {
          locationId = collection.locationId;
        } else if (collection.locationId._id) {
          locationId = collection.locationId._id.toString();
        } else if (collection.locationId.toString) {
          locationId = collection.locationId.toString();
        }
      }
      
      if (locationId) {
        // Use hook function to fetch location data
        await fetchLocationData(locationId);
      } else {
        // No locationId - manual entry mode
        setSelectedLocationId('');
        setSelectedLocationData(null);
        setUseExistingLocation(false);
      }
      
      // Set editing state - ensure collection ID is a string
      const collectionIdStr = collection._id?.toString() || String(collection._id);
      
      // For agents, ensure they stay in "use existing location" mode
      if (user?.role === USER_ROLES.AGENT) {
        setUseExistingLocation(true);
      }
      
      openEditModalWithData(collectionIdStr);
      openCreateModal();
    } catch (error) {
      logger.error('Failed to prepare edit form:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load collection data for editing';
      
      // Provide more helpful error messages for agents
      if (user?.role === USER_ROLES.AGENT) {
        if (errorMessage.includes('created, collected') || errorMessage.includes('locations assigned')) {
          toast.error('You can only edit collections you created, collected, or for locations assigned to you.', { duration: 5000 });
        } else if (errorMessage.includes('created or collected')) {
          toast.error('You can only edit collections you created or collected.', { duration: 5000 });
        } else {
          toast.error(errorMessage, { duration: 5000 });
        }
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    // Ensure collectionId is a string
    const collectionIdStr = collectionId?.toString() || String(collectionId);
    
    logger.debug('Delete collection clicked', {
      collectionId: collectionIdStr,
      userRole: user?.role,
      userId: user?._id?.toString(),
    });
    
    // Check if collection is already deleted (shouldn't happen, but handle gracefully)
    const collection = collections.find(c => {
      const cId = c._id?.toString() || String(c._id);
      return cId === collectionIdStr;
    });
    
    if (!collection) {
      toast.error('Collection not found. It may have been deleted. Please refresh the page.');
      return;
    }
    
    // Log collection details for debugging
    logger.debug('Collection to delete', {
      collectionId: collectionIdStr,
      collectionUserId: collection.userId?._id?.toString() || collection.userId?.toString(),
      collectionCollectedBy: collection.collectedBy?._id?.toString() || collection.collectedBy?.toString(),
      collectionLocationId: collection.locationId?._id?.toString() || collection.locationId?.toString(),
      hasReceipt: !!collection.receiptNumber,
      userRole: user?.role,
      userId: user?._id?.toString(),
    });
    
    openDeleteConfirmWithData(collectionIdStr);
    openDeleteConfirm();
  };

  const confirmDeleteCollection = async () => {
    if (!deleteCollectionId) {
      logger.warn('confirmDeleteCollection called without deleteCollectionId');
      return;
    }

    logger.debug('Confirming delete collection', {
      deleteCollectionId,
      userRole: user?.role,
      userId: user?._id?.toString(),
      collectionsLength: collections.length,
    });

    const collectionIdStr = typeof deleteCollectionId === 'string' 
      ? deleteCollectionId 
      : deleteCollectionId?.toString() || String(deleteCollectionId);
    
    const result = await deleteCollectionAction(collectionIdStr);
    
    if (result.success) {
      closeDeleteConfirm();
      closeDeleteConfirmData();
    } else {
      // Error already handled in hook with toast
      // Re-throw error so ConfirmationModal knows not to close
      throw new Error(result.error || 'Failed to delete collection');
    }
  };

  // Get collection ID from modal data
  const _deleteCollectionIdStr = deleteCollectionId 
    ? (typeof deleteCollectionId === 'string' ? deleteCollectionId : deleteCollectionId?.toString() || String(deleteCollectionId))
    : null;

  const handleClearFilters = () => {
    setSearchQuery('');
    clearFilters();
    setTimePeriod('all');
  };
  
  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
    const today = new Date();
    const endDateObj = new Date(today);
    endDateObj.setHours(23, 59, 59, 999);
    
    let startDateObj = new Date();
    
    switch (period) {
      case 'today':
        startDateObj = new Date(today);
        startDateObj.setHours(0, 0, 0, 0);
        updateFilter('startDate', startDateObj.toISOString().split('T')[0]);
        updateFilter('endDate', endDateObj.toISOString().split('T')[0]);
        break;
      case 'lastWeek':
        startDateObj = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDateObj.setHours(0, 0, 0, 0);
        updateFilter('startDate', startDateObj.toISOString().split('T')[0]);
        updateFilter('endDate', endDateObj.toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        startDateObj = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDateObj.setHours(0, 0, 0, 0);
        updateFilter('startDate', startDateObj.toISOString().split('T')[0]);
        updateFilter('endDate', endDateObj.toISOString().split('T')[0]);
        break;
      case 'last3Months':
        startDateObj = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        startDateObj.setHours(0, 0, 0, 0);
        updateFilter('startDate', startDateObj.toISOString().split('T')[0]);
        updateFilter('endDate', endDateObj.toISOString().split('T')[0]);
        break;
      case 'all':
      default:
        updateFilter('startDate', '');
        updateFilter('endDate', '');
        break;
    }
  };

  const handleQuickDateRange = (range) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    
    switch (range) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        setTimePeriod('today');
        break;
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        setTimePeriod('lastMonth');
        break;
      case 'last-3-months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        startDate.setHours(0, 0, 0, 0);
        setTimePeriod('last3Months');
        break;
      case 'last-6-months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        startDate.setHours(0, 0, 0, 0);
        setTimePeriod('all');
        break;
      case 'last-year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        startDate.setHours(0, 0, 0, 0);
        setTimePeriod('all');
        break;
      default:
        return;
    }
    
    updateFilter('startDate', startDate.toISOString().split('T')[0]);
    updateFilter('endDate', endDate.toISOString().split('T')[0]);
  };
  
  const hasActiveFilters = useMemo(() => 
    searchQuery || filters.status !== 'all' || filters.agentFilter !== 'all' || 
    filters.locationType !== 'all' || filters.startDate || filters.endDate || filters.sortBy !== 'newest',
    [searchQuery, filters.status, filters.agentFilter, filters.locationType, filters.startDate, filters.endDate, filters.sortBy]
  );

  const handleTransferCollection = (collectionId) => {
    openTransferModalWithData(collectionId);
    setSelectedAgentId('');
    openTransferModal();
  };

  const handleConfirmTransfer = async () => {
    if (!selectedAgentId) {
      toast.error('Please select an agent');
      return;
    }

    const result = await transferCollectionAction(transferringCollectionId, selectedAgentId);
    
    if (result.success) {
      closeTransferModal();
      closeTransferModalData();
      setSelectedAgentId('');
    }
  };

  const handleExportCollections = async () => {
    try {
      const params = {
        format: exportFormat,
      };
      if (filters.locationType !== 'all') params.locationType = filters.locationType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.agentFilter !== 'all') params.userId = filters.agentFilter;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const blob = await collectionApi.exportCollections(params);
      
      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Received empty file from server');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = exportFormat === 'xlsx' ? '.xlsx' : '.csv';
      a.download = `collections-export-${new Date().toISOString().split('T')[0]}${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Collections exported as ${exportFormat.toUpperCase()} successfully`);
    } catch (error) {
      logger.error('Failed to export collections:', error);
      let errorMessage = 'Failed to export collections';
      
      if (error?.response?.data) {
        if (typeof error.response.data === 'object' && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  // Note: Import-related functions (handleDownloadTemplate, validateFile, handleValidateImport, 
  // pollJobStatus, handleImportCollections, handleCancelImport) are now handled inside CollectionImport component

  const resetForm = () => {
    closeEditModalData();
    collectionForm.reset({
      locationType: COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
      locationName: '',
      locality: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      collectionItems: [
        { materialType: 'mixed-plastic', weight: '', rate: '' },
      ],
      gstRate: 18,
      collectionDate: new Date().toISOString().split('T')[0],
    });
    resetLocationState();
  };

  // Note: handleLocationSelect and calculateTotals are now handled inside CollectionForm component

  if (loading && collections.length === 0) {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
            <Skeleton variant="text" width="250px" height="1rem" />
          </div>
          <Skeleton variant="rectangular" width="120px" height="40px" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Collections</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
            Manage recycling collections from apartments, societies, and gated communities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isAdmin(user) && (
            <>
              <Button
                onClick={openImportModal}
                variant="secondary"
                icon={Upload}
                className="flex-shrink-0"
              >
                Import
              </Button>
              <Button
                onClick={openArchiveDuplicatesConfirm}
                variant="secondary"
                className="flex-shrink-0"
              >
                Archive Duplicate Collections
              </Button>
              <div className="flex items-center gap-0 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border-0 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer h-full"
                  title="Select export format"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
                <Button
                  onClick={handleExportCollections}
                  variant="secondary"
                  size="sm"
                  className="rounded-l-none border-l border-gray-300 dark:border-gray-600 flex-shrink-0"
                  title={`Export collections as ${exportFormat.toUpperCase()}`}
                  icon={Download}
                >
                  Export
                </Button>
              </div>
            </>
          )}
          {(user?.role === USER_ROLES.AGENT || isAdmin(user)) && (
            <Button
              onClick={openCreateModal}
              variant="primary"
              icon={Plus}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline">New Collection</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>


      {/* Filters */}
      <CollectionFilters
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={handleClearFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        timePeriod={timePeriod}
        onTimePeriodChange={handleTimePeriodChange}
        onQuickDateRange={handleQuickDateRange}
        hasActiveFilters={hasActiveFilters}
        agents={agents}
        user={user}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={toggleAdvancedFilters}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CollectionTable
          collections={collections}
          user={user}
          onEdit={handleEditCollection}
          onDelete={handleDeleteCollection}
          onTransfer={handleTransferCollection}
          onGenerateReceipt={handleGenerateReceipt}
          onPrintReceipt={handlePrintReceipt}
          onDownloadReceipt={handleDownloadReceipt}
        />
      </div>

      {totalPages > 1 && (
          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
      )}

      {/* Create/Edit Collection Modal */}
      <CollectionForm
        isOpen={showCreateModal}
        onClose={() => {
          closeCreateModal();
          resetForm();
        }}
        editingCollectionId={editingCollectionId}
        formData={formData}
        setFormData={setFormData}
        useExistingLocation={useExistingLocation}
        setUseExistingLocation={setUseExistingLocation}
        selectedLocationId={selectedLocationId}
        setSelectedLocationId={setSelectedLocationId}
        selectedLocationData={selectedLocationData}
        setSelectedLocationData={setSelectedLocationData}
        showLocationModal={showLocationModal}
        onOpenLocationModal={openLocationModal}
        user={user}
        onSubmit={handleSubmitCollection}
        onSuccess={() => {
          // Additional success handling if needed
        }}
      />

      {/* Transfer Collection Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Transfer Collection
            </h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select an agent to transfer this collection to. This action will change the ownership of the collection.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Agent
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isTransferring}
                >
                  <option value="">-- Select an agent --</option>
                  {agents.map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>

              {agents.length === 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  No active agents found. Please create an agent first.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => {
                  closeTransferModal();
                  closeTransferModalData();
                  setSelectedAgentId('');
                }}
                variant="secondary"
                disabled={isTransferring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmTransfer}
                variant="primary"
                disabled={!selectedAgentId || isTransferring}
                isLoading={isTransferring}
                loadingText="Transferring..."
                icon={UserCog}
              >
                Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={closeLocationModal}
        onSuccess={() => {
          closeLocationModal();
          // Refresh location autocomplete by clearing and re-searching
          setSelectedLocationId('');
          setSelectedLocationData(null);
        }}
      />

      {/* Import Modal */}
      <CollectionImport
        isOpen={showImportModal}
        onClose={closeImportModal}
        onImportComplete={fetchCollections}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeletingFromHook) {
            closeDeleteConfirm();
            closeDeleteConfirmData();
          }
        }}
        onConfirm={confirmDeleteCollection}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? This action cannot be undone."
        confirmText={isDeletingFromHook ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showArchiveDuplicatesConfirm}
        onClose={closeArchiveDuplicatesConfirm}
        onConfirm={async () => {
          try {
            await runArchiveDuplicateCollections('dry-run');
            closeArchiveDuplicatesConfirm();
            openArchiveDuplicatesApplyConfirm();
          } catch (_error) {
            // Errors are already toasted inside runArchiveDuplicateCollections.
            // Keep the modal open so the user can retry or cancel.
          }
        }}
        title="Archive Duplicate Collections (Dry Run)"
        message="This will analyze duplicate collections by receipt number or by (userId, locationId, collectionDate, totalAmount) and report which collections would be archived. No changes will be applied in dry-run mode."
        confirmText="Run Dry Run"
        cancelText="Cancel"
        variant="info"
      />

      <ConfirmationModal
        isOpen={showArchiveDuplicatesApplyConfirm}
        onClose={closeArchiveDuplicatesApplyConfirm}
        onConfirm={async () => {
          try {
            await runArchiveDuplicateCollections('apply');
            closeArchiveDuplicatesApplyConfirm();
          } catch (_error) {
            // Errors are already toasted inside runArchiveDuplicateCollections.
            // Keep the modal open so the user can retry or cancel.
          }
        }}
        title="Archive Duplicate Collections (Apply)"
        message="This will soft-delete duplicate collections. This action can be reverted from the Archived page."
        confirmText="Apply"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Receipt Generation Modal */}
      <ReceiptGenerationModal
        isOpen={showReceiptModal}
        onClose={() => {
          closeReceiptModal();
          closeReceiptModalData();
        }}
        collection={receiptCollection}
        onConfirm={handleConfirmReceiptGeneration}
        isGenerating={isGeneratingReceipt}
      />
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const CollectionsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Collections"
      message="Something went wrong while loading the collections page. Please try refreshing the page."
    >
      <Collections />
    </ErrorBoundary>
  );
};

export default CollectionsWithErrorBoundary;

;

