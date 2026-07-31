import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';
import logger from '../../utils/logger';

/**
 * Extract the analytics payload from the API response.
 * Handles both normalized and raw nested ({ data: {...} }) shapes.
 */
const getAnalyticsData = (data) => {
  if (!data) return null;
  if (data.series && Array.isArray(data.series)) return data;
  if (data.data?.series && Array.isArray(data.data.series)) return data.data;
  if (data.byAction && typeof data.byAction === 'object') return data;
  if (data.data?.byAction && typeof data.data.byAction === 'object') return data.data;
  return null;
};

/**
 * Custom hook for fetching audit log analytics
 * @param {Object} filters - Filter parameters (startDate, endDate, entityType)
 * @param {Object} options - Query options (enabled)
 * @returns {Object} { analytics, loading, error, refetch }
 */
export const useAuditLogStats = (filters = {}, options = {}) => {
  const { startDate = '', endDate = '', entityType = '' } = filters;
  const { enabled = false } = options;

  const analyticsParams = useMemo(() => {
    const params = {
      enhanced: 'true',
      groupBy: 'day',
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (entityType) params.entityType = entityType;

    return params;
  }, [startDate, endDate, entityType]);

  const queryKey = useMemo(
    () => ['auditLogs', 'analytics', startDate, endDate, entityType],
    [startDate, endDate, entityType]
  );

  const queryFn = useMemo(
    () => createQueryFn(() => auditApi.getAuditLogStats(analyticsParams)),
    [analyticsParams]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 60000,
  });

  const analytics = useMemo(() => {
    const payload = getAnalyticsData(data);
    if (!payload) {
      if (import.meta.env.DEV && data) {
        logger.debug('[useAuditLogStats] Unexpected data format:', data);
      }
      return null;
    }

    // Enhanced endpoint returns { groupBy, series: [{ _id: { period, action }, count }] }
    if (payload.series && Array.isArray(payload.series)) {
      const { groupBy, series } = payload;

      const actionCounts = {};
      const periodTotals = {};

      series.forEach((row) => {
        const action = row._id?.action || 'unknown';
        const count = Number(row.count) || 0;

        actionCounts[action] = (actionCounts[action] || 0) + count;

        const period = row._id?.period;
        let periodKey = '';

        if (groupBy === 'month' && period?.y !== undefined && period?.m !== undefined) {
          periodKey = `${period.y}-${String(period.m).padStart(2, '0')}`;
        } else if (groupBy === 'week' && period?.y !== undefined && period?.w !== undefined) {
          periodKey = `${period.y}-W${String(period.w).padStart(2, '0')}`;
        } else if (period?.y !== undefined && period?.m !== undefined && period?.d !== undefined) {
          periodKey = `${period.y}-${String(period.m).padStart(2, '0')}-${String(period.d).padStart(2, '0')}`;
        } else {
          periodKey = String(row._id);
        }

        periodTotals[periodKey] = (periodTotals[periodKey] || 0) + count;
      });

      const total = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({
          action,
          count,
          percentage: total ? Math.round((count / total) * 100) : 0,
        }));

      const sortedPeriods = Object.entries(periodTotals)
        .sort(([a], [b]) => a.localeCompare(b));

      let activityTrend = 'stable';
      if (sortedPeriods.length >= 2) {
        const previous = sortedPeriods[sortedPeriods.length - 2][1];
        const latest = sortedPeriods[sortedPeriods.length - 1][1];
        if (latest > previous) activityTrend = 'increasing';
        else if (latest < previous) activityTrend = 'decreasing';
      }

      return { topActions, activityTrend, byAction: actionCounts, total };
    }

    // Non-enhanced endpoint fallback returns { total, byAction: { action: count } }
    if (payload.byAction && typeof payload.byAction === 'object') {
      const byAction = payload.byAction;
      const total = Object.values(byAction).reduce((sum, count) => sum + count, 0);

      const topActions = Object.entries(byAction)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({
          action,
          count,
          percentage: total ? Math.round((count / total) * 100) : 0,
        }));

      return { topActions, activityTrend: 'stable', byAction, total };
    }

    return null;
  }, [data]);

  return {
    analytics,
    loading: isLoading,
    error,
    refetch,
  };
};

export default useAuditLogStats;
