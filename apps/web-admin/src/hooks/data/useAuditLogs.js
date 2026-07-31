import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';

/**
 * Extract the page payload from the API response.
 * Handles both the normalized { logs, total, ... } shape and the
 * raw / partially normalized { data: { logs, total, ... } } shape.
 */
const getPageData = (data) => {
  if (!data) return null;
  if (data.logs && Array.isArray(data.logs)) return data;
  if (data.data?.logs && Array.isArray(data.data.logs)) return data.data;
  return null;
};

/**
 * Custom hook for fetching audit log data
 * @param {Object} filters - Filter parameters
 * @returns {Object} { auditLogs, total, totalPages, loading, error, refetch }
 */
export const useAuditLogs = (filters = {}) => {
  const {
    page = 1,
    entityType = '',
    action = '',
    search = '',
    startDate = '',
    endDate = '',
  } = filters;

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 20,
    };

    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return params;
  }, [page, entityType, action, search, startDate, endDate]);

  const queryKey = useMemo(
    () => ['auditLogs', page, entityType, action, search, startDate, endDate],
    [page, entityType, action, search, startDate, endDate]
  );

  const queryFn = useMemo(
    () => createQueryFn(() => auditApi.getAuditLogs(queryParams)),
    [queryParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    staleTime: 30000,
  });

  const pageData = useMemo(() => getPageData(data), [data]);

  const auditLogs = useMemo(() => {
    if (!pageData) return [];
    return pageData.logs || [];
  }, [pageData]);

  const total = useMemo(() => pageData?.total ?? 0, [pageData]);

  const totalPages = useMemo(() => pageData?.totalPages ?? 1, [pageData]);

  return {
    auditLogs,
    total,
    totalPages,
    loading: isLoading,
    error,
    refetch,
  };
};

export default useAuditLogs;
