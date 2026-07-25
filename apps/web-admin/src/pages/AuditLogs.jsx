import { useMemo, useState, useCallback } from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  PlusCircle,
  Receipt,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auditApi } from '../api';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import Skeleton from '../components/shared/Skeleton';
import Table from '../components/data/Table';
import Pagination from '../components/shared/Pagination';
import Button from '../components/shared/Button';
import PageHeader from '../components/shared/PageHeader';
import EmptyState from '../components/shared/EmptyState';
import AuditLogFilters from '../components/audit/AuditLogFilters';
import { useAuditFilters, useAuditLogs, useAuditLogStats } from '../hooks';
import { formatDate } from '../utils/formatDate';
import logger from '../utils/logger';

const getActionIcon = (action) => {
  switch (action) {
    case 'created':
      return { icon: PlusCircle, color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'updated':
      return { icon: Activity, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'deleted':
      return { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100' };
    case 'receipt_generated':
      return { icon: Receipt, color: 'text-amber-600', bgColor: 'bg-amber-100' };
    case 'transferred':
      return { icon: ArrowLeftRight, color: 'text-orange-600', bgColor: 'bg-orange-100' };
    default:
      return { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

const StatCard = ({ label, value, icon: Icon, color }) => {
  const colorMap = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-100' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-100' },
    green: { text: 'text-green-600', bg: 'bg-green-100' },
  };

  const { text, bg } = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold leading-none text-gray-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 ${bg} rounded-lg`}>
          <Icon className={`w-6 h-6 ${text}`} />
        </div>
      </div>
    </div>
  );
};

const AuditLogs = () => {
  const { filters, updateFilter, clearFilters, setPage } = useAuditFilters();
  const { page, entityType, action, search, startDate, endDate } = filters;

  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { auditLogs, total, totalPages, loading, error, refetch } = useAuditLogs(filters);
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAuditLogStats(
    { startDate, endDate, entityType },
    { enabled: showAnalytics }
  );

  const handleSearch = useCallback(
    (searchTerm) => {
      updateFilter('search', searchTerm);
    },
    [updateFilter]
  );

  const handleExport = useCallback(async () => {
    if (exporting) return;

    setExporting(true);
    try {
      const params = {
        ...(entityType && { entityType }),
        ...(action && { action }),
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
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
    } catch (err) {
      logger.error('Failed to export audit logs:', err);
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  }, [exporting, entityType, action, search, startDate, endDate]);

  const formattedLogs = useMemo(
    () =>
      (auditLogs || []).map((log) => {
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
      }),
    [auditLogs]
  );

  const columns = useMemo(
    () => [
      {
        key: 'icon',
        label: 'Type',
        render: (_, row) => {
          const Icon = row.icon;
          return (
            <div className={`p-2 rounded-lg ${row.bgColor} inline-flex`}>
              <Icon className={`w-5 h-5 ${row.color}`} aria-label={row.action} />
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
          <span className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400 capitalize">
            {action.replace(/_/g, ' ')}
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
    ],
    []
  );

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Audit Logs"
          subtitle="System activity and audit trails"
        />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg sm:text-xl font-semibold leading-snug text-red-800 dark:text-red-200 mb-2">
            Error loading audit logs
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error?.message || 'Failed to load audit logs. Please try again.'}
          </p>
          <Button variant="primary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const pageActions = (
    <>
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
        onClick={handleExport}
        variant="success"
        icon={Download}
        disabled={exporting}
        isLoading={exporting}
        loadingText="Exporting..."
      >
        Export CSV
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="System activity and audit trails"
        actions={pageActions}
      />

      {showAnalytics && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold leading-snug text-gray-900 dark:text-white mb-4">
            Audit Log Analytics
          </h2>

          {analyticsLoading ? (
            <Skeleton variant="text" lines={3} />
          ) : analyticsError ? (
            <div className="text-red-600 dark:text-red-300">
              {analyticsError?.message || 'Failed to load analytics. Please try again.'}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top Actions
                </h3>
                <div className="space-y-2">
                  {analytics.topActions?.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400 capitalize">
                        {item.action.replace(/_/g, ' ')}
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
                  <span
                    className={`text-lg sm:text-xl font-bold leading-snug ${
                      analytics.activityTrend === 'increasing'
                        ? 'text-green-600'
                        : analytics.activityTrend === 'decreasing'
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {analytics.activityTrend === 'increasing'
                      ? '↑'
                      : analytics.activityTrend === 'decreasing'
                        ? '↓'
                        : '→'}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400 capitalize">
                    {analytics.activityTrend}
                  </span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    By Action Type
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.byAction || {})
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between">
                          <span className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400 capitalize">
                            {action.replace(/_/g, ' ')}
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
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No analytics data"
              description="No analytics available for the selected filters."
            />
          )}
        </div>
      )}

      {showFilters && (
        <AuditLogFilters
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          onSearch={handleSearch}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard label="Total Logs" value={total} icon={Activity} color="blue" />
        <StatCard
          label="Current Page"
          value={`${page} / ${totalPages}`}
          icon={FileText}
          color="indigo"
        />
        <StatCard label="Showing" value={auditLogs.length} icon={Eye} color="green" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold leading-snug text-gray-900 dark:text-white">
            Audit Log Entries
          </h2>
        </div>
        <Table columns={columns} data={formattedLogs} />
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

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
