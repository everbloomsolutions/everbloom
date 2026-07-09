import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api';
import { Activity, User, Search, Filter, Clock, FileText, Receipt, Package, Download, BarChart3 } from 'lucide-react';
import Skeleton from '../components/shared/Skeleton';
import Table from '../components/data/Table';
import Pagination from '../components/shared/Pagination';
import Button from '../components/shared/Button';
import { formatDate } from '../utils/formatDate';
import logger from '../utils/logger';
import { toast } from 'react-hot-toast';
import { useDebounce } from '../hooks';
import { createQueryFn } from '../utils/queryAdapter';

const AuditLogs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse filters from URL
  const filters = useMemo(() => ({
    entityType: searchParams.get('entityType') || '',
    action: searchParams.get('action') || '',
    search: searchParams.get('search') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams]);

  const [searchQuery, setSearchQuery] = useState(filters.search);
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (debouncedSearch) {
          newParams.set('search', debouncedSearch);
        } else {
          newParams.delete('search');
        }
        newParams.set('page', '1'); // Reset to first page
        return newParams;
      });
    }
  }, [debouncedSearch, filters.search, setSearchParams]);

  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build query params for API call
  const queryParams = useMemo(() => ({
    page: filters.page,
    limit: 20,
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.action && { action: filters.action }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
  }), [filters.page, filters.entityType, filters.action, debouncedSearch, filters.startDate, filters.endDate]);

  // Use TanStack Query for data fetching
  const { data: auditLogsData, isLoading: loading, error: _error, refetch: _refetch } = useQuery({
    queryKey: ['auditLogs', filters.page, filters.entityType, filters.action, debouncedSearch, filters.startDate, filters.endDate],
    queryFn: createQueryFn(() => auditApi.getAuditLogs(queryParams)),
    staleTime: 30000, // 30 seconds
  });

  // Extract data from response (after adapter transformation)
  const result = auditLogsData || {};
  const auditLogs = result.auditLogs || [];
  const total = result.total || 0;
  const totalPages = result.totalPages || 1;
  const currentPage = filters.page;

  // Fetch analytics when shown
  const analyticsParams = useMemo(() => ({
    enhanced: 'true',
    groupBy: 'day',
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.entityType && { entityType: filters.entityType }),
  }), [filters.startDate, filters.endDate, filters.entityType]);

  const { data: analyticsData } = useQuery({
    queryKey: ['auditLogs', 'analytics', filters.startDate, filters.endDate, filters.entityType],
    queryFn: createQueryFn(() => auditApi.getAuditLogStats(analyticsParams)),
    enabled: showAnalytics, // Only fetch when analytics is shown
    staleTime: 60000, // 1 minute
  });

  const analytics = analyticsData;

  const handleFilterChange = (key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      newParams.set('page', '1'); // Reset to first page when filters change
      return newParams;
    });
    
    // Update local search query if it's the search filter
    if (key === 'search') {
      setSearchQuery(value);
    }
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchQuery('');
  };

  const setPage = (page) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'updated':
        return { icon: Activity, color: 'text-primary-600', bgColor: 'bg-primary-100' };
      case 'deleted':
        return { icon: Activity, color: 'text-red-600', bgColor: 'bg-red-100' };
      case 'receipt_generated':
        return { icon: Receipt, color: 'text-purple-600', bgColor: 'bg-purple-100' };
      case 'transferred':
        return { icon: Package, color: 'text-orange-600', bgColor: 'bg-orange-100' };
      default:
        return { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const formattedLogs = auditLogs.map(log => {
    const { icon, color, bgColor } = getActionIcon(log.action);
    return {
      id: log._id,
      icon,
      color,
      bgColor,
      entityType: log.entityType,
      action: log.action,
      description: log.description || `${log.action} ${log.entityType}`,
      performedBy: log.performedBy?.name || log.performedBy?.email || 'System',
      timestamp: log.createdAt,
      changes: log.changes,
      notes: log.notes,
      ipAddress: log.ipAddress,
    };
  });

  const columns = [
    {
      key: 'icon',
      label: 'Action',
      render: (_, row) => {
        const Icon = row.icon;
        return (
          <div className={`p-2 rounded-lg ${row.bgColor} inline-flex`}>
            <Icon className={`w-5 h-5 ${row.color}`} />
          </div>
        );
      },
    },
    {
      key: 'entityType',
      label: 'Entity',
      render: (entityType) => (
        <span className="font-medium text-gray-900 dark:text-white capitalize">
          {entityType}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (action) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
          {action.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (description) => (
        <span className="text-gray-900 dark:text-white">{description}</span>
      ),
    },
    {
      key: 'performedBy',
      label: 'Performed By',
      render: (performedBy) => (
        <span className="text-gray-600 dark:text-gray-400">{performedBy}</span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Time',
      render: (timestamp) => (
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4 mr-2" />
          {formatDate(timestamp, 'PPp')}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            System activity and audit trails
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="secondary"
            icon={BarChart3}
          >
            Analytics
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="secondary"
            icon={Filter}
          >
            Filters
          </Button>
          <Button
            onClick={async () => {
              if (exporting) return;
              setExporting(true);
              try {
                const params = {
                  ...(filters.entityType && { entityType: filters.entityType }),
                  ...(filters.action && { action: filters.action }),
                  ...(filters.search && { search: filters.search }),
                  ...(filters.startDate && { startDate: filters.startDate }),
                  ...(filters.endDate && { endDate: filters.endDate }),
                };
                const blob = await auditApi.exportCSV(params);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                logger.error('Failed to export audit logs:', error);
                toast.error('Failed to export audit logs');
              } finally {
                setExporting(false);
              }
            }}
            variant="success"
            icon={Download}
            disabled={exporting}
            isLoading={exporting}
            loadingText="Exporting..."
          >
            Export CSV
          </Button>
        </div>
      </div>

      {showAnalytics && analytics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Audit Log Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Top Actions
              </h3>
              <div className="space-y-2">
                {analytics.topActions?.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {item.action.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Trend
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${
                  analytics.activityTrend === 'increasing' ? 'text-green-600' :
                  analytics.activityTrend === 'decreasing' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {analytics.activityTrend === 'increasing' ? '↑' :
                   analytics.activityTrend === 'decreasing' ? '↓' : '→'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {analytics.activityTrend}
                </span>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  By Entity Type
                </h4>
                <div className="space-y-2">
                  {Object.entries(analytics.byEntityType || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {type}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entity Type
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="project">Project</option>
                <option value="receipt">Receipt</option>
                <option value="user">User</option>
                <option value="location">Location</option>
                <option value="contact">Contact</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="receipt_generated">Receipt Generated</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search descriptions..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={clearFilters}
                variant="secondary"
                fullWidth
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Logs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {total}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Activity className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Current Page</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {currentPage} / {totalPages}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Showing</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {auditLogs.length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audit Log Entries
          </h2>
        </div>
        <Table columns={columns} data={formattedLogs} />
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {formattedLogs.length === 0 && !loading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
          <Activity className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
        </div>
      )}
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const AuditLogsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Audit Logs"
      message="Something went wrong while loading the audit logs page. Please try refreshing the page."
    >
      <AuditLogs />
    </ErrorBoundary>
  );
};

export default AuditLogsWithErrorBoundary;
