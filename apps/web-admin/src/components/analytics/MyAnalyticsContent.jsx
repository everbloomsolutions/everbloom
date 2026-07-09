import { memo } from 'react';
import { Package, Receipt, Recycle, IndianRupee } from 'lucide-react';
import { Pie, Bar } from 'react-chartjs-2';
import Loader from '../shared/Loader';
import { getLocationTypeLabel, getMaterialTypeLabel } from '../../types/collections';
import { formatDate } from '../../utils/formatDate';
import '../../utils/chartConfig'; // Ensure Chart.js is registered

const MyAnalyticsContent = memo(({ 
  analytics, 
  dateRangeType, 
  setDateRangeType, 
  customDateRange, 
  setCustomDateRange, 
  loading,
  error,
  formatCurrency
}) => {
  if (loading && !analytics) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400 py-8">
        <p className="font-semibold mb-2">Failed to load your analytics</p>
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
  const materialTypes = Array.isArray(analytics.byMaterialType) ? analytics.byMaterialType : [];
  const locationTypes = Array.isArray(analytics.byLocationType) ? analytics.byLocationType : [];
  
  const materialTypeLabels = materialTypes.length > 0
    ? materialTypes.map(item => getMaterialTypeLabel(item.materialType || 'Unknown'))
    : ['No Data'];
  const materialTypeCounts = materialTypes.length > 0
    ? materialTypes.map(item => item.count || 0)
    : [0];
  const materialTypeWeights = materialTypes.length > 0
    ? materialTypes.map(item => item.totalWeight || 0)
    : [0];

  const pieData = {
    labels: materialTypeLabels,
    datasets: [{
      label: 'Collections by Material Type',
      data: materialTypeCounts,
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(236, 72, 153, 1)',
      ],
      borderWidth: 1,
    }],
  };

  const barData = {
    labels: materialTypeLabels,
    datasets: [{
      label: 'Weight (kg)',
      data: materialTypeWeights,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  };

  return (
    <div>
      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Collections
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.overview?.totalCollections || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Receipt className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Receipts
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.overview?.totalReceipts || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Recycle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Weight
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(analytics.overview?.totalWeight || 0).toFixed(2)} kg
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <IndianRupee className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Revenue
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(analytics.overview?.totalAmount || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Collections by Material Type
          </h3>
          {materialTypes.length > 0 ? (
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
                          const total = materialTypeCounts.reduce((a, b) => a + b, 0);
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
              No material type data available
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weight by Material Type
          </h3>
          {materialTypes.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 1,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `Weight: ${context.parsed.y.toFixed(2)} kg`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No weight data available
            </div>
          )}
        </div>
      </div>

      {/* Material Type Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Material Type Breakdown
        </h3>
        <div className="space-y-3">
          {materialTypes.length > 0 ? (
            materialTypes.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {getMaterialTypeLabel(item.materialType)}
                </span>
                <div className="flex gap-6">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.count || 0} collections
                  </span>
                  <span className="font-semibold text-primary-600">
                    {(item.totalWeight || 0).toFixed(2)} kg
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No material type data available
            </div>
          )}
        </div>
      </div>

      {/* Location Type Breakdown */}
      {locationTypes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Collections by Location Type
          </h3>
          <div className="space-y-3">
            {locationTypes.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {getLocationTypeLabel(item.locationType)}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {item.count || 0} collections
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Collections - Simplified */}
      {analytics.recentCollections && analytics.recentCollections.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Collections
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.recentCollections.slice(0, 10).map((collection, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {collection.locationName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {collection.collectionDate ? formatDate(collection.collectionDate, 'PP') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(collection.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {collection.receiptNumber || 'N/A'}
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
});

MyAnalyticsContent.displayName = 'MyAnalyticsContent';

export default MyAnalyticsContent;
