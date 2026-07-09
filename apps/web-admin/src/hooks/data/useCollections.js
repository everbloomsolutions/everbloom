import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collectionApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';
import { queryClient } from '../../providers/QueryProvider';

/**
 * Build query parameters from filters
 */
const buildQueryParams = (filters) => {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 10,
    serviceType: 'recycling',
  };

  if (filters.locationType && filters.locationType !== 'all') {
    params.locationType = filters.locationType;
  }

  if (filters.search) {
    params.search = filters.search;
  }

  if (filters.status === 'with-receipt') {
    params.hasReceipt = true;
  } else if (filters.status === 'without-receipt') {
    params.hasReceipt = false;
  }

  if (filters.agentFilter && filters.agentFilter !== 'all') {
    params.userId = filters.agentFilter;
  }

  if (filters.startDate) {
    params.startDate = new Date(filters.startDate).toISOString();
  }

  if (filters.endDate) {
    params.endDate = new Date(filters.endDate).toISOString();
  }

  if (filters.sortBy) {
    params.sortBy = filters.sortBy;
  }

  return params;
};

/**
 * Custom hook for fetching and managing collections data
 * @param {Object} filters - Filter parameters
 * @returns {Object} { collections, totalPages, total, loading, error, refetch, clearCache }
 */
export const useCollections = (filters = {}) => {
  const queryParams = useMemo(() => buildQueryParams(filters), [filters]);

  // Query key based on filter params
  const queryKey = useMemo(
    () => [
      'collections',
      filters.page,
      filters.limit,
      filters.locationType,
      filters.search,
      filters.status,
      filters.agentFilter,
      filters.startDate,
      filters.endDate,
      filters.sortBy,
    ],
    [
      filters.page,
      filters.limit,
      filters.locationType,
      filters.search,
      filters.status,
      filters.agentFilter,
      filters.startDate,
      filters.endDate,
      filters.sortBy,
    ]
  );

  // Query function with response adapter
  const queryFn = useMemo(
    () => createQueryFn(() => collectionApi.getAllCollections(queryParams)),
    [queryParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    staleTime: 15000, // 15 seconds (matches previous cacheTTL)
    refetchOnMount: true, // Match previous refetchOnMount: true
  });

  // Clear cache function using queryClient.invalidateQueries
  const clearCache = useMemo(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    };
  }, []);

  const collections = useMemo(() => {
    if (!data) return [];

    // After adapter transformation, data should be the direct data object
    // Handle format: { projects: [...], total: ..., totalPages: ... }
    let result = [];

    if (data.projects && Array.isArray(data.projects)) {
      result = data.projects;
    } else if (data.data?.projects && Array.isArray(data.data.projects)) {
      result = data.data.projects;
    }

    // Client-side filtering: Remove deleted collections
    result = result.filter(collection => {
      if (collection.isDeleted === true) return false;
      if (collection.deletedAt && collection.deletedAt !== null) return false;
      return true;
    });

    return result;
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return data.totalPages || 1;
  }, [data]);

  const total = useMemo(() => {
    if (!data) return 0;
    return data.total || 0;
  }, [data]);

  return {
    collections,
    totalPages,
    total,
    loading: isLoading,
    error,
    refetch,
    clearCache,
  };
};
