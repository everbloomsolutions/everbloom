import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';
import logger from '../../utils/logger';

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

  const auditLogs = useMemo(() => {
    if (!data) return [];

    if (data.logs && Array.isArray(data.logs)) {
      return data.logs;
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (import.meta.env.DEV) {
      logger.debug('[useAuditLogs] Unexpected data format:', data);
    }

    return [];
  }, [data]);

  const total = useMemo(() => data?.total || 0, [data]);

  const totalPages = useMemo(() => data?.totalPages || 1, [data]);

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
