import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { Users, Search, Edit, X, ChevronDown, ChevronUp, MapPin, AlertCircle, UserCog } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignApi, userApi, locationApi } from '../../api';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import LocationAutocomplete from '../locations/LocationAutocomplete';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/formatDate';
import Pagination from '../shared/Pagination';
import Skeleton from '../shared/Skeleton';
import EmptyState from '../shared/EmptyState';
import { useDebounce, useModal, useModalWithData, useAuth } from '../../hooks';
import { createQueryFn } from '../../utils/queryAdapter';
import logger from '../../utils/logger';
import { isAdmin } from '../../utils/permissionUtils';

const AgentAssignmentTab = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expandedAgents, setExpandedAgents] = useState(new Set());
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Modal state using useModal hooks
  const { isOpen: isModalOpen, open: openModal, close: closeModal } = useModal();
  const { isOpen: isTransferModalOpen, open: openTransferModal, close: closeTransferModal } = useModal();
  const { data: selectedAgent, openWithData: openModalWithAgent, close: closeModalData } = useModalWithData({
    onClose: () => {
      setSelectedLocations([]);
    },
  });
  const { data: transferData, openWithData: openTransferModalWithLocation, close: closeTransferModalData } = useModalWithData({
    onClose: () => {
      setSelectedAgentId('');
    },
  });
  
  // Extract location and current agent from transferData
  const transferringLocation = transferData?.location;
  const currentAgent = transferData?.agent;

  // Fetch agents with TanStack Query
  // Always paginate to avoid loading very large datasets into the UI.
  const {
    data: agentsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['agents-with-locations', page, debouncedSearch],
    queryFn: createQueryFn(() =>
      assignApi.getAgentsWithLocations({
        page,
        limit: 25,
        search: debouncedSearch || undefined,
      })
    ),
    staleTime: 30000,
  });

  // Fetch total locations count (only for admin/super_admin)
  const {
    data: locationsData,
    isLoading: locationsLoading,
  } = useQuery({
    queryKey: ['total-locations-count'],
    queryFn: createQueryFn(() =>
      locationApi.getLocations({
        page: 1,
        limit: 1, // We only need the total count
      })
    ),
    enabled: isAdmin(user), // Only fetch for admin/super_admin
    staleTime: 60000, // Cache for 1 minute
  });

  const totalLocationsCount = useMemo(() => {
    if (!locationsData || !isAdmin(user)) return null;
    // Handle different response formats
    if (locationsData.total !== undefined) {
      return locationsData.total;
    }
    if (locationsData.data?.total !== undefined) {
      return locationsData.data.total;
    }
    if (locationsData.pagination?.total !== undefined) {
      return locationsData.pagination.total;
    }
    return 0;
  }, [locationsData, user]);

  // Extract agents and pagination from response
  // Handle both direct data format and nested data format
  const agents = useMemo(() => {
    if (!agentsData) return [];
    // Try direct format first (after adapter extraction)
    if (Array.isArray(agentsData.agents)) {
      return agentsData.agents;
    }
    // Try nested format (if adapter didn't extract)
    if (agentsData.data?.agents && Array.isArray(agentsData.data.agents)) {
      return agentsData.data.agents;
    }
    return [];
  }, [agentsData]);

  const totalPages = useMemo(() => {
    if (!agentsData) return 1;
    // Try direct format first
    if (agentsData.pagination?.pages) {
      return agentsData.pagination.pages;
    }
    // Try nested format
    if (agentsData.data?.pagination?.pages) {
      return agentsData.data.pagination.pages;
    }
    return 1;
  }, [agentsData]);

  const error = queryError?.response?.data?.message || queryError?.message || null;

  // Mutation for assigning locations
  const assignLocationsMutation = useMutation({
    mutationFn: ({ agentId, locationIds }) =>
      assignApi.assignAgentLocations(agentId, locationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-with-locations'] });
    },
  });

  // Mutation for transferring location
  const transferLocationMutation = useMutation({
    mutationFn: ({ locationId, newAgentId }) =>
      assignApi.transferLocation(locationId, newAgentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-with-locations'] });
      toast.success('Location transferred successfully');
      closeTransferModal();
      closeTransferModalData();
      setSelectedAgentId('');
    },
    onError: (error) => {
      logger.error('Failed to transfer location:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer location');
    },
  });

  // Fetch agents for transfer modal
  const fetchAgents = useCallback(async () => {
    try {
      const response = await userApi.getAllUsers({ role: 'agent', limit: 100 });
      if (response.success && response.data) {
        const users = response.data.users || response.data || [];
        const activeAgents = users.filter(u => u.role === 'agent' && u.isActive !== false);
        setAvailableAgents(activeAgents);
      }
    } catch (error) {
      logger.error('Failed to fetch agents:', error);
    }
  }, []);

  // Fetch agents when transfer modal opens
  useEffect(() => {
    if (isTransferModalOpen) {
      fetchAgents();
    }
  }, [isTransferModalOpen, fetchAgents]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const toggleExpand = useCallback((agentId) => {
    setExpandedAgents((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(agentId)) {
        newExpanded.delete(agentId);
      } else {
        newExpanded.add(agentId);
      }
      return newExpanded;
    });
  }, []);

  const handleAssignLocations = useCallback((agent) => {
    openModalWithAgent(agent);
    setSelectedLocations(agent.locations || []);
    openModal();
  }, [openModalWithAgent, openModal]);

  const handleRemoveAllLocations = useCallback(async (agent) => {
    if (!confirm(`Remove all locations from ${agent.name}?`)) {
      return;
    }

    try {
      const response = await assignApi.assignAgentLocations(agent._id, []);
      if (response.success) {
        toast.success('All locations removed successfully');
        queryClient.invalidateQueries({ queryKey: ['agents-with-locations'] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove locations');
    }
  }, [queryClient]);

  const handleAddLocation = (location) => {
    if (location && !selectedLocations.find(loc => loc._id === location._id)) {
      setSelectedLocations([...selectedLocations, location]);
    }
  };

  const handleRemoveLocation = (locationId) => {
    setSelectedLocations(selectedLocations.filter(loc => loc._id !== locationId));
  };

  const handleSaveLocations = useCallback(async () => {
    if (!selectedAgent) return;

    try {
      const locationIds = selectedLocations.map(loc => loc._id);
      await assignLocationsMutation.mutateAsync({
        agentId: selectedAgent._id,
        locationIds,
      });
      toast.success(`Successfully assigned ${locationIds.length} location(s) to agent`);
      closeModal();
      closeModalData();
      setSelectedLocations([]);
    } catch (error) {
      logger.error('Failed to assign locations:', error);
      toast.error(error.response?.data?.message || 'Failed to assign locations');
    }
  }, [selectedAgent, selectedLocations, assignLocationsMutation, closeModal, closeModalData]);

  // Conditionally include locationCount column only for admin/super_admin
  const columns = useMemo(() => {
    const baseColumns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
    ];

    // Only show Locations columns for admin/super_admin
    if (isAdmin(user)) {
      baseColumns.push({
        key: 'locationCount',
        label: 'Assigned Locations',
        render: (count, agent) => (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-sm font-medium">
              {count || 0}
            </span>
            {count > 0 && (
              <button
                onClick={() => toggleExpand(agent._id)}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              >
                {expandedAgents.has(agent._id) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        ),
      });
      
      // Add total available locations column
      baseColumns.push({
        key: 'totalAvailableLocations',
        label: 'Total Available Locations',
        render: (_, _agent) => {
          if (locationsLoading) {
            return (
              <span className="text-sm text-gray-400 dark:text-gray-500">Loading...</span>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                {totalLocationsCount !== null ? totalLocationsCount : '-'}
              </span>
              {totalLocationsCount !== null && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (can assign)
                </span>
              )}
            </div>
          );
        },
      });
    }

    baseColumns.push(
      {
        key: 'createdAt',
        label: 'Joined',
        render: (date) => formatDate(date, 'PP'),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, agent) => (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAssignLocations(agent)}
            >
              <Edit className="w-4 h-4 mr-1" />
              {agent.locationCount > 0 ? 'Reassign' : 'Assign'}
            </Button>
            {agent.locationCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRemoveAllLocations(agent)}
              >
                <X className="w-4 h-4 mr-1" />
                Remove All
              </Button>
            )}
          </div>
        ),
      }
    );

    return baseColumns;
  }, [user, expandedAgents, toggleExpand, handleAssignLocations, handleRemoveAllLocations, totalLocationsCount, locationsLoading]);

  // Custom row renderer to show expanded locations
  const renderRow = useCallback((agent, columns) => {
    const isExpanded = expandedAgents.has(agent._id);
    return (
      <React.Fragment key={agent._id}>
        <tr className="border-b border-gray-200 dark:border-gray-700">
          {columns.map((col) => (
            <td key={col.key} className="px-6 py-4 whitespace-nowrap">
              {col.render
                ? col.render(agent[col.key], agent)
                : agent[col.key]}
            </td>
          ))}
        </tr>
        {isExpanded && agent.locations && agent.locations.length > 0 && (
          <tr key={`${agent._id}-expanded`}>
            <td colSpan={columns.length} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Locations:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(agent.locations || []).map((location) => (
                    <div
                      key={location._id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <MapPin className="w-4 h-4 mr-2 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {location.locationName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {location.address}
                            {location.city && `, ${location.city}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openTransferModalWithLocation({ location, agent });
                          openTransferModal();
                        }}
                        className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                        title="Transfer location to another agent"
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  }, [expandedAgents, openTransferModal, openTransferModalWithLocation]);

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search agents by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agents ({agents.length})
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
                Error Loading Agents
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button variant="primary" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : agents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No agents found"
              description={debouncedSearch ? 'Try adjusting your search query' : 'No users with role "agent" found'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {(agents || []).map((agent) => renderRow(agent, columns))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && debouncedSearch && (
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

      {/* Assign Locations Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          closeModal();
          closeModalData();
          setSelectedLocations([]);
        }}
        title={selectedAgent ? `Assign Locations to ${selectedAgent.name}` : 'Assign Locations'}
        size="lg"
      >
        {selectedAgent && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add Locations
              </label>
              <LocationAutocomplete
                value=""
                onChange={() => {}}
                onLocationSelect={handleAddLocation}
                placeholder="Search and add locations..."
              />
            </div>
            {selectedLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Locations ({selectedLocations.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedLocations.map((location) => (
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
                        onClick={() => handleRemoveLocation(location._id)}
                        className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                        aria-label="Remove location"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  closeModal();
                  closeModalData();
                  setSelectedLocations([]);
                }}
                disabled={assignLocationsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveLocations}
                isLoading={assignLocationsMutation.isPending}
                disabled={assignLocationsMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer Location Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => {
          closeTransferModal();
          closeTransferModalData();
          setSelectedAgentId('');
        }}
        title={transferringLocation ? `Transfer ${transferringLocation.locationName}` : 'Transfer Location'}
        size="md"
      >
        {transferringLocation && (
          <div className="space-y-6">
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {transferringLocation.locationName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {transferringLocation.address}
                    {transferringLocation.city && `, ${transferringLocation.city}`}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select an agent to transfer this location to. This will reassign the location from the current agent to the selected agent.
              </p>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={transferLocationMutation.isPending}
              >
                <option value="">-- Select an agent --</option>
                {availableAgents
                  .filter(a => currentAgent && a._id !== currentAgent._id) // Exclude current agent
                  .map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
              </select>
            </div>

            {availableAgents.length === 0 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                No active agents found. Please create an agent first.
              </p>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  closeTransferModal();
                  closeTransferModalData();
                  setSelectedAgentId('');
                }}
                disabled={transferLocationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!selectedAgentId) {
                    toast.error('Please select an agent');
                    return;
                  }
                  transferLocationMutation.mutate({
                    locationId: transferringLocation._id,
                    newAgentId: selectedAgentId,
                  });
                }}
                disabled={!selectedAgentId || transferLocationMutation.isPending}
                isLoading={transferLocationMutation.isPending}
                loadingText="Transferring..."
                icon={UserCog}
              >
                Transfer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AgentAssignmentTab;
