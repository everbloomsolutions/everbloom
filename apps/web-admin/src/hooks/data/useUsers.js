import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';
import logger from '../../utils/logger';

/**
 * Custom hook for fetching and managing users data
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Current page number
 * @param {number} filters.limit - Items per page
 * @param {string} filters.search - Search query (name or email)
 * @param {string} filters.role - Filter by role
 * @param {boolean} filters.isActive - Filter by active status
 * @returns {Object} { users, totalPages, total, loading, error, refetch }
 */
export const useUsers = (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    isActive = undefined,
  } = filters;

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
    };

    if (search) {
      params.search = search;
    }

    if (role) {
      params.role = role;
    }

    if (isActive !== undefined) {
      params.isActive = isActive;
    }

    return params;
  }, [page, limit, search, role, isActive]);

  // Query key based on filter params
  const queryKey = useMemo(
    () => ['users', page, limit, search, role, isActive],
    [page, limit, search, role, isActive]
  );

  // Query function with response adapter
  const queryFn = useMemo(
    () => createQueryFn(() => userApi.getAllUsers(queryParams)),
    [queryParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    staleTime: 30000, // 30 seconds (matches previous cacheTTL)
  });

  const users = useMemo(() => {
    if (!data) {
      if (import.meta.env.DEV) {
        logger.debug('[useUsers] No data received');
      }
      return [];
    }
    
    // After adapter transformation, data should be the direct data object
    // Handle format: { users: [...], total: ..., totalPages: ... }
    if (data.users && Array.isArray(data.users)) {
      return data.users;
    }
    
    // Fallback: empty array if no users found
    if (import.meta.env.DEV) {
      logger.debug('[useUsers] Unexpected data format:', data);
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
    users,
    totalPages,
    total,
    loading: isLoading,
    error,
    refetch,
  };
};
