import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationApi } from '../../api';
import { analyticsApi } from '../../api';
import { userApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';

/**
 * Calculate date range based on dateRangeType
 */
const calculateDateRange = (dateRangeType, customDateRange) => {
  const now = new Date();
  let startDate, endDate;

  switch (dateRangeType) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'lastWeek':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'lastMonth':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case '6months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case '1year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (customDateRange?.startDate && customDateRange?.endDate) {
        startDate = new Date(customDateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        return { startDate: undefined, endDate: undefined };
      }
      break;
    default:
      return { startDate: undefined, endDate: undefined };
  }

  // Format dates as YYYY-MM-DD in local timezone
  const formatDateLocal = (date) => {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDateLocal(startDate),
    endDate: formatDateLocal(endDate),
  };
};

/**
 * Custom hook for fetching analytics data
 * @param {string} type - Analytics type: 'location', 'user', 'agent', 'collection', 'my-analytics'
 * @param {Object} options - Options object
 * @param {string} options.dateRangeType - Date range type
 * @param {Object} options.customDateRange - Custom date range { startDate, endDate }
 * @param {string} options.locationTypeFilter - Location type filter
 * @param {string} options.granularity - Time granularity (for collection analytics)
 * @returns {Object} { data, loading, error, refetch }
 */
export const useAnalytics = (type, options = {}) => {
  const {
    dateRangeType = 'lastMonth',
    customDateRange = {},
    locationTypeFilter = 'all',
    granularity = 'daily',
  } = options;

  const dateRange = useMemo(
    () => calculateDateRange(dateRangeType, customDateRange),
    [dateRangeType, customDateRange]
  );

  const queryParams = useMemo(() => {
    const params = {};

    if (dateRange.startDate) {
      params.startDate = dateRange.startDate;
    }
    if (dateRange.endDate) {
      params.endDate = dateRange.endDate;
    }

    if (locationTypeFilter && locationTypeFilter !== 'all') {
      params.locationType = locationTypeFilter;
    }

    if (granularity && type === 'collection') {
      params.granularity = granularity;
    }

    return params;
  }, [dateRange.startDate, dateRange.endDate, locationTypeFilter, granularity, type]);

  // Query key based on type and query params
  const queryKey = useMemo(
    () => ['analytics', type, dateRange.startDate, dateRange.endDate, locationTypeFilter, granularity],
    [type, dateRange.startDate, dateRange.endDate, locationTypeFilter, granularity]
  );

  // Query function with response adapter
  const queryFn = useMemo(() => {
    let apiFunction;
    switch (type) {
      case 'location':
        apiFunction = () => locationApi.getLocationAnalytics(queryParams);
        break;
      case 'my-analytics':
        apiFunction = () => userApi.getMyCollectionAnalytics(queryParams);
        break;
      case 'user':
        apiFunction = () => userApi.getUserStats();
        break;
      case 'agent':
        apiFunction = () => analyticsApi.getAgentPerformanceAnalytics(queryParams);
        break;
      case 'collection':
        apiFunction = () => analyticsApi.getCollectionAnalytics(queryParams);
        break;
      default:
        return null;
    }
    return createQueryFn(apiFunction);
  }, [type, queryParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled: queryFn !== null, // Only fetch if queryFn is valid
    staleTime: 60000, // 1 minute (matches previous cacheTTL)
  });

  // After adapter transformation, data should be the direct data object
  const analyticsData = useMemo(() => {
    if (!data) return null;
    return data || null;
  }, [data]);

  return {
    data: analyticsData,
    loading: isLoading,
    error,
    refetch,
  };
};
