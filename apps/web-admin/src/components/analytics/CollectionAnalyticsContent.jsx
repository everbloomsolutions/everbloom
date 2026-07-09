import { useState, memo } from 'react';
import { Recycle, Package, IndianRupee, Receipt } from 'lucide-react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import Loader from '../shared/Loader';
import { getMaterialTypeLabel } from '../../types/collections';
import { formatDate } from '../../utils/formatDate';
import '../../utils/chartConfig'; // Ensure Chart.js is registered

const CollectionAnalyticsContent = memo(({ 
  analytics, 
  financialAnalytics, 
  timeSeriesAnalytics, 
  dateRangeType, 
  setDateRangeType, 
  customDateRange, 
  setCustomDateRange, 
  granularity, 
  setGranularity, 
  loading,
  error,
  formatCurrency, 
  formatPercentage 
}) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');

  if (loading && !analytics) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400 py-8">
        <p className="font-semibold mb-2">Failed to load collection analytics</p>
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
  const materialTypeLabels = materialTypes.length > 0
    ? materialTypes.map(item => getMaterialTypeLabel(item.materialType || 'Unknown'))
    : ['No Data'];
  const materialTypeCounts = materialTypes.length > 0
    ? materialTypes.map(item => item.count || 0)
    : [0];

  const getMaterialTypeColor = (type) => {
    const colorMap = {
      'mixed-plastic': { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' },
      'paper': { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' },
      'iron': { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' },
      'aluminium': { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },
      'wood': { bg: 'rgba(180, 83, 9, 0.8)', border: 'rgba(180, 83, 9, 1)' },
      'copper': { bg: 'rgba(220, 38, 38, 0.8)', border: 'rgba(220, 38, 38, 1)' },
    };
    return colorMap[type] || { bg: 'rgba(156, 163, 175, 0.8)', border: 'rgba(156, 163, 175, 1)' };
  };

  const pieData = {
    labels: materialTypeLabels,
    datasets: [{
      label: 'Collections by Type',
      data: materialTypeCounts,
      backgroundColor: materialTypes.map(item => getMaterialTypeColor(item.materialType).bg),
      borderColor: materialTypes.map(item => getMaterialTypeColor(item.materialType).border),
      borderWidth: 1,
    }],
  };

  const barData = {
    labels: materialTypeLabels,
    datasets: [{
      label: 'Collections by Type',
      data: materialTypeCounts,
      backgroundColor: materialTypes.map(item => getMaterialTypeColor(item.materialType).bg),
      borderColor: materialTypes.map(item => getMaterialTypeColor(item.materialType).border),
      borderWidth: 1,
    }],
  };

  const statCards = [
    {
      title: 'Total Recycled',
      value: `${(analytics?.totalRecycled || 0).toFixed(2)} kg`,
      icon: Recycle,
      color: 'bg-green-500',
      subtext: 'Total weight collected',
    },
    {
      title: 'Total Pickups',
      value: analytics?.totalPickups || 0,
      icon: Package,
      color: 'bg-primary-500',
      subtext: 'Total collections',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(financialAnalytics?.totalRevenue || 0),
      icon: IndianRupee,
      color: 'bg-emerald-500',
      subtext: 'Total revenue generated',
    },
    {
      title: 'Total GST',
      value: formatCurrency(financialAnalytics?.totalGST || 0),
      icon: Receipt,
      color: 'bg-purple-500',
      subtext: 'Total GST collected',
    },
  ];

  return (
    <div>
      {/* Sub Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'financial', label: 'Financial' },
            { id: 'time-series', label: 'Trends' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          {activeSubTab === 'time-series' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Granularity
              </label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
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

      {/* Stat Cards */}
      <div className={`grid gap-6 mb-8 ${activeSubTab === 'overview' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                {stat.title}
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Collection Item Types (Pie Chart)
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
                  No material type data available
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Collection Item Types (Bar Chart)
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
                            precision: 0,
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
                              return `Collections: ${context.parsed.y}`;
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
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Material Type Statistics
            </h3>
            <div className="space-y-3">
              {materialTypes.length > 0 ? (
                materialTypes.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
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
                  No collection data available for the selected period
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Financial Tab - Simplified */}
      {activeSubTab === 'financial' && financialAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Average Collection Value</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(financialAnalytics.averageCollectionValue || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">With Receipt</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {financialAnalytics.collectionsWithReceipt || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Without Receipt</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {financialAnalytics.collectionsWithoutReceipt || 0}
              </p>
            </div>
          </div>

          {financialAnalytics.revenueByMaterialType && financialAnalytics.revenueByMaterialType.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue by Material Type
              </h3>
              <div className="space-y-4">
                {financialAnalytics.revenueByMaterialType.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {getMaterialTypeLabel(item.materialType)}
                    </span>
                    <div className="flex gap-6">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.revenue || 0)}
                      </span>
                      <span className="font-semibold text-purple-600">
                        GST: {formatCurrency(item.gst || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time-Series Tab - Simplified */}
      {activeSubTab === 'time-series' && timeSeriesAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Collections Growth</h3>
              <p className={`text-2xl font-bold ${timeSeriesAnalytics.growthMetrics?.collectionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(timeSeriesAnalytics.growthMetrics?.collectionsGrowth || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Weight Growth</h3>
              <p className={`text-2xl font-bold ${timeSeriesAnalytics.growthMetrics?.weightGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(timeSeriesAnalytics.growthMetrics?.weightGrowth || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Revenue Growth</h3>
              <p className={`text-2xl font-bold ${timeSeriesAnalytics.growthMetrics?.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(timeSeriesAnalytics.growthMetrics?.revenueGrowth || 0)}
              </p>
            </div>
          </div>

          {timeSeriesAnalytics.trends && timeSeriesAnalytics.trends.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Trends
              </h3>
              {timeSeriesAnalytics.trends && timeSeriesAnalytics.trends.length > 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <Line
                    data={{
                      labels: timeSeriesAnalytics.trends.map(t => formatDate(t.date, 'MMM d')),
                      datasets: [
                        {
                          label: 'Revenue',
                          data: timeSeriesAnalytics.trends.map(t => t.revenue || 0),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                          fill: true,
                        },
                        {
                          label: 'Collections',
                          data: timeSeriesAnalytics.trends.map(t => t.collections || 0),
                          borderColor: 'rgb(16, 185, 129)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          tension: 0.4,
                          fill: true,
                          yAxisID: 'y1',
                        },
                      ],
                    }}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          position: 'left',
                          ticks: {
                            precision: 0,
                          },
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          beginAtZero: true,
                          ticks: {
                            precision: 0,
                          },
                          grid: {
                            drawOnChartArea: false,
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
                <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No trends data available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CollectionAnalyticsContent.displayName = 'CollectionAnalyticsContent';

export default CollectionAnalyticsContent;
