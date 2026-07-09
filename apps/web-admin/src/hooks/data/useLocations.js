import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';
import { queryClient } from '../../providers/QueryProvider';

/**
 * Custom hook for fetching and managing locations data
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Current page number
 * @param {number} filters.limit - Items per page
 * @param {string} filters.search - Search query
 * @param {string} filters.locationType - Filter by location type
 * @param {string} filters.status - Filter by status ('all', 'active', 'inactive')
 * @param {string} filters.city - Filter by city
 * @param {string} filters.state - Filter by state
 * @param {number} filters.minUsageCount - Minimum usage count
 * @param {number} filters.maxUsageCount - Maximum usage count
 * @param {boolean} filters.neverUsed - Filter for never used locations
 * @param {string} filters.sortBy - Sort order
 * @returns {Object} { locations, totalPages, total, loading, error, refetch, clearCache }
 */
export const useLocations = (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    locationType = 'all',
    status = 'all',
    city = '',
    state = '',
    minUsageCount = '',
    maxUsageCount = '',
    neverUsed = false,
    sortBy = 'newest',
  } = filters;

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
      sortBy,
    };

    if (search) {
      params.search = search;
    }

    if (locationType !== 'all') {
      params.locationType = locationType;
    }

    if (status !== 'all') {
      params.isActive = status === 'active';
    }

    if (city) {
      params.city = city;
    }

    if (state) {
      params.state = state;
    }

    if (minUsageCount) {
      params.minUsageCount = parseInt(minUsageCount);
    }

    if (maxUsageCount) {
      params.maxUsageCount = parseInt(maxUsageCount);
    }

    if (neverUsed) {
      params.maxUsageCount = 0;
    }

    return params;
  }, [page, limit, search, locationType, status, city, state, minUsageCount, maxUsageCount, neverUsed, sortBy]);

  // Query key based on filter params
  const queryKey = useMemo(
    () => ['locations', page, limit, search, locationType, status, city, state, minUsageCount, maxUsageCount, neverUsed, sortBy],
    [page, limit, search, locationType, status, city, state, minUsageCount, maxUsageCount, neverUsed, sortBy]
  );

  // Query function with response adapter
  const queryFn = useMemo(
    () => createQueryFn(() => locationApi.getLocations(queryParams)),
    [queryParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    staleTime: 60000, // 1 minute (matches previous cacheTTL)
  });

  // Clear cache function using queryClient.invalidateQueries
  const clearCache = useMemo(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    };
  }, []);

  const locations = useMemo(() => {
    if (!data) {
      return [];
    }
    
    // After adapter transformation, data should be the direct data object
    // Handle format: { locations: [...], total: ..., totalPages: ... }
    if (data.locations && Array.isArray(data.locations)) {
      return data.locations;
    }
    
    return [];
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
    locations,
    totalPages,
    total,
    loading: isLoading,
    error,
    refetch,
    clearCache,
  };
};
