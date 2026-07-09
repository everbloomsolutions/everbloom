import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';

/**
 * Custom hook for fetching users with locations data
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Current page number
 * @param {number} filters.limit - Items per page
 * @param {string} filters.search - Search query
 * @returns {Object} { users, totalPages, loading, error, refetch }
 */
export const useUsersWithLocations = (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
  } = filters;

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
    };

    if (search) {
      params.search = search;
    }

    return params;
  }, [page, limit, search]);

  // Query key based on filter params
  const queryKey = useMemo(
    () => ['users-with-locations', page, limit, search],
    [page, limit, search]
  );

  // Query function with response adapter
  const queryFn = useMemo(
    () => createQueryFn(() => assignApi.getUsersWithLocations(queryParams)),
    [queryParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    staleTime: 30000, // 30 seconds
  });

  // Extract users and pagination from response
  const users = useMemo(() => {
    if (!data) return [];
    
    // Handle different response formats
    if (data.users && Array.isArray(data.users)) {
      return data.users;
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    
    // Handle different pagination formats
    if (data.pagination?.pages) {
      return data.pagination.pages;
    }
    if (data.pages) {
      return data.pages;
    }
    if (data.totalPages) {
      return data.totalPages;
    }
    
    return 1;
  }, [data]);

  return {
    users,
    totalPages,
    loading: isLoading,
    error,
    refetch,
  };
};

export default useUsersWithLocations;
