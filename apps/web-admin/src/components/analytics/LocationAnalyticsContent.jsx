import { memo } from 'react';
import { MapPin, TrendingUp, Package } from 'lucide-react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import Loader from '../shared/Loader';
import { getLocationTypeLabel } from '../../types/collections';
import { formatDate } from '../../utils/formatDate';
import '../../utils/chartConfig'; // Ensure Chart.js is registered

const LocationAnalyticsContent = memo(({ 
  analytics, 
  dateRange: _dateRange, 
  setDateRange: _setDateRange, 
  dateRangeType, 
  setDateRangeType, 
  customDateRange, 
  setCustomDateRange, 
  locationTypeFilter, 
  setLocationTypeFilter, 
  loading, 
  error,
  userRole: _userRole 
}) => {
  if (loading && !analytics) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400 py-8">
        <p className="font-semibold mb-2">Failed to load location analytics</p>
        <p className="text-sm">{error.message || 'An error occurred'}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No analytics data available
      </div>
    );
  }

  // Safe data extraction with fallbacks
  const byType = analytics.byType || {};
  const mostUsed = Array.isArray(analytics.mostUsed) ? analytics.mostUsed : [];
  const usageTrends = Array.isArray(analytics.usageTrends) ? analytics.usageTrends : [];

  // Import formatDate utility

  // Pie chart data - Usage by Location Type (handle null values)
  const processedByType = {};
  Object.entries(byType).forEach(([key, value]) => {
    if (value != null && value > 0) {
      // Normalize null/undefined/empty keys
      const normalizedKey = (key === null || key === undefined || key === '' || key === 'null') 
        ? 'Unknown' 
        : key;
      processedByType[normalizedKey] = (processedByType[normalizedKey] || 0) + value;
    }
  });

  const pieData = {
    labels: Object.keys(processedByType).length > 0 
      ? Object.keys(processedByType).map(type => {
          return type === 'Unknown' 
            ? 'Unknown/Not Specified' 
            : getLocationTypeLabel(type);
        })
      : ['No Data'],
    datasets: [{
      data: Object.keys(processedByType).length > 0 
        ? Object.values(processedByType)
        : [1],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
    }],
  };

  // Bar chart data - Top 10 Most Used Locations
  const barData = {
    labels: mostUsed.length > 0
      ? mostUsed.slice(0, 10).map(loc => loc.locationName || 'Unknown')
      : ['No Data'],
    datasets: [{
      label: 'Usage Count',
      data: mostUsed.length > 0
        ? mostUsed.slice(0, 10).map(loc => loc.usageCount || 0)
        : [0],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }],
  };

  // Line chart data - Usage Over Time
  const lineData = {
    labels: usageTrends.length > 0
      ? usageTrends.map(trend => formatDate(trend.date, 'MMM d'))
      : ['No Data'],
    datasets: [{
      label: 'Collections',
      data: usageTrends.length > 0
        ? usageTrends.map(trend => trend.count || 0)
        : [0],
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className={`grid grid-cols-1 gap-4 ${dateRangeType === 'custom' ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <select
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="lastWeek">Last Week</option>
              <option value="lastMonth">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          {dateRangeType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
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
              value={locationTypeFilter}
              onChange={(e) => setLocationTypeFilter(e.target.value)}
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
            <TrendingUp className="w-8 h-8 text-green-500" />
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
            <Package className="w-8 h-8 text-purple-500" />
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
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usage by Location Type
          </h3>
          {Object.keys(byType).length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Pie 
                data={pieData} 
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return `${label}: ${value} (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No location type data available
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Most Used Locations
          </h3>
          {mostUsed.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  indexAxis: 'y',
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `Usage: ${context.parsed.x}`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No location usage data available
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Usage Over Time
        </h3>
        {usageTrends.length > 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Line 
              data={lineData} 
              options={{
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                    },
                  },
                  x: {
                    ticks: {
                      maxRotation: 45,
                      minRotation: 45,
                    },
                  },
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false,
                },
              }}
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No usage trends data available
          </div>
        )}
      </div>
    </div>
  );
});

LocationAnalyticsContent.displayName = 'LocationAnalyticsContent';

export default LocationAnalyticsContent;
