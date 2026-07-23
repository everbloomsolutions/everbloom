import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, TrendingUp, BarChart3, Activity, AlertTriangle, Heart } from 'lucide-react';
import Loader from '../components/shared/Loader';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { formatCurrency } from '../utils/formatCurrency';
import { useAnalytics } from '../hooks';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { getLocationTypeLabel } from '../types/collections';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const LocationAnalytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse filters from URL
  const filters = useMemo(() => ({
    dateRangeType: searchParams.get('dateRangeType') || 'lastMonth',
    locationTypeFilter: searchParams.get('locationTypeFilter') || 'all',
    customStartDate: searchParams.get('customStartDate') || '',
    customEndDate: searchParams.get('customEndDate') || '',
  }), [searchParams]);

  // Custom date range object for useAnalytics hook
  const customDateRange = useMemo(() => ({
    startDate: filters.customStartDate || undefined,
    endDate: filters.customEndDate || undefined,
  }), [filters.customStartDate, filters.customEndDate]);

  // Use useAnalytics hook for data fetching
  const { data: analytics, loading, error } = useAnalytics('location', {
    dateRangeType: filters.dateRangeType,
    customDateRange,
    locationTypeFilter: filters.locationTypeFilter,
  });

  // Filter handlers with URL persistence
  const handleDateRangeChange = useCallback((type, customStartDate, customEndDate) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('dateRangeType', type);
      if (type === 'custom') {
        if (customStartDate) newParams.set('customStartDate', customStartDate);
        else newParams.delete('customStartDate');
        if (customEndDate) newParams.set('customEndDate', customEndDate);
        else newParams.delete('customEndDate');
      } else {
        newParams.delete('customStartDate');
        newParams.delete('customEndDate');
      }
      return newParams;
    });
  }, [setSearchParams]);

  const handleLocationTypeFilterChange = useCallback((value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set('locationTypeFilter', value);
      } else {
        newParams.delete('locationTypeFilter');
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Calculate date range for display
  const dateRange = useMemo(() => {
    if (filters.dateRangeType === 'custom') {
      return {
        startDate: filters.customStartDate || '',
        endDate: filters.customEndDate || '',
      };
    }
    // For preset ranges, calculate dates
    const now = new Date();
    let startDate, endDate;
    
    switch (filters.dateRangeType) {
      case 'today':
        startDate = new Date(now).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      case 'lastWeek':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      default:
        startDate = '';
        endDate = '';
    }
    
    return { startDate, endDate };
  }, [filters.dateRangeType, filters.customStartDate, filters.customEndDate]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500 dark:text-red-400">
          Error loading analytics: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          No analytics data available
        </div>
      </div>
    );
  }

  const pieData = {
    labels: Object.keys(analytics.byType).map(type => getLocationTypeLabel(type)),
    datasets: [{
      data: Object.values(analytics.byType),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
      ],
    }],
  };

  const barData = {
    labels: analytics.mostUsed.slice(0, 10).map(loc => loc.locationName),
    datasets: [{
      label: 'Usage Count',
      data: analytics.mostUsed.slice(0, 10).map(loc => loc.usageCount),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }],
  };

  const lineData = {
    labels: (analytics.usageTrends || []).map(trend => trend.date),
    datasets: [{
      label: 'Collections',
      data: (analytics.usageTrends || []).map(trend => trend.count),
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    }],
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Location Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Insights and statistics for registered locations
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Period
            </label>
            <select
              value={filters.dateRangeType}
              onChange={(e) => handleDateRangeChange(e.target.value, dateRange.startDate, dateRange.endDate)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="lastWeek">Last Week</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          {filters.dateRangeType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('custom', e.target.value, dateRange.endDate)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('custom', dateRange.startDate, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location Type
            </label>
            <select
              value={filters.locationTypeFilter}
              onChange={(e) => handleLocationTypeFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="residential-apartment">Residential Apartment</option>
              <option value="residential-society">Residential Society</option>
              <option value="residential-gated-community">Residential Gated Community</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.total}
              </p>
            </div>
            <MapPin className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Locations</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {analytics.active}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.totalUsage}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.averageUsage.toFixed(1)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usage by Location Type
          </h3>
          <Pie data={pieData} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Most Used Locations
          </h3>
          <Bar
            data={barData}
            options={{
              indexAxis: 'y',
              responsive: true,
              plugins: {
                legend: { display: false },
              },
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Usage Over Time
        </h3>
        <Line data={lineData} />
      </div>

      {/* Location Health Scores */}
      {analytics.locationHealthScores && analytics.locationHealthScores.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Location Health Scores (Top 20)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Health Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Collections</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg/Collection</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.locationHealthScores.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.locationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.healthScore >= 70 ? 'bg-green-500' :
                              item.healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.healthScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.healthScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.totalCollections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(item.averageRevenuePerCollection)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Underperforming Locations */}
      {analytics.underperformingLocations && analytics.underperformingLocations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Underperforming Locations
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days Since Last Collection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.underperformingLocations.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.locationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.daysSinceLastCollection} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400">
                      {item.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Geographic Distribution */}
      {analytics.geographicDistribution && analytics.geographicDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geographic Distribution
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Collections</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.geographicDistribution.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.city || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.state || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.collections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Cities Table */}
      {analytics.byCity && analytics.byCity.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Locations by City
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Location Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.byCity.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const LocationAnalyticsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Location Analytics"
      message="Something went wrong while loading the location analytics page. Please try refreshing the page."
    >
      <LocationAnalytics />
    </ErrorBoundary>
  );
};

export default LocationAnalyticsWithErrorBoundary;

