import { Briefcase, Package, Receipt, IndianRupee, CheckCircle, Calendar } from 'lucide-react';
import ChartCard from '../data/ChartCard';
import { Line } from 'react-chartjs-2';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatNumber } from '../../utils/formatNumber';
import { DISPLAY_LIMITS, getCollections, hasCollections } from '../../utils/dashboardHelpers';

/**
 * Dashboard Recent Activity Component
 * Displays recent collections, charts, and activity timeline
 */
const DashboardRecentActivity = ({ recentData, stats, isAdmin: _isAdmin, isAgent, isUser, navigate }) => {
  if (!recentData) return null;

  return (
    <>
      {/* User Activity Summary - Only for User role */}
      {isUser && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Activity Overview
          </h2>
          
          {/* Activity Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900">
                  <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Collections</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.overview?.totalCollections || getCollections(recentData).length || 0}
                  </p>
                  {stats?.overview?.totalCollections && hasCollections(recentData) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {getCollections(recentData).length} recent
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">With Receipts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {getCollections(recentData).filter(c => c.receiptNumber).length || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <IndianRupee className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(
                      getCollections(recentData).reduce((sum, c) => sum + (c.totalAmount || 0), 0) || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Activity Timeline - Only for User role */}
      {isUser && hasCollections(recentData) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Activity Timeline
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              
              <div className="space-y-6">
                {getCollections(recentData).slice(0, DISPLAY_LIMITS.TIMELINE_COLLECTIONS).map((collection) => (
                  <div key={collection._id} className="relative flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
                      collection.receiptNumber 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-primary-100 dark:bg-primary-900'
                    }`}>
                      {collection.receiptNumber ? (
                        <Receipt className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    
                    {/* Activity content */}
                    <div className="flex-1 min-w-0 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {collection.receiptNumber ? 'Receipt Generated' : 'Collection Recorded'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {collection.locationName || 'Collection Location'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          {collection.collectionDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(collection.collectionDate, 'PP')}</span>
                            </div>
                          )}
                          {collection.receiptNumber && (
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Receipt #{collection.receiptNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        {collection.totalWeight && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">{formatNumber(collection.totalWeight)} kg</span>
                          </div>
                        )}
                        {collection.totalAmount && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <IndianRupee className="w-4 h-4" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(collection.totalAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {getCollections(recentData).length > DISPLAY_LIMITS.TIMELINE_COLLECTIONS && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigate('/collections')}
                  className="w-full text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  View All Collections ({getCollections(recentData).length} total) →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Data - Simplified for User role */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {isUser ? 'My Collections Overview' : isAgent ? 'My Recent Activity' : 'Recent Data'}
        </h2>
        <div className={`grid grid-cols-1 ${isUser ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
          {/* Collections Growth - Only for Admin/Agent */}
          {!isUser && recentData.collectionsGrowth && (
            <ChartCard title={isAgent ? "My Collections Growth (Last Month)" : "Collections Growth (Last Month)"}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {recentData.collectionsGrowth.thisMonth}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Month</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {recentData.collectionsGrowth.lastMonth}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Growth</p>
                    {recentData.collectionsGrowth.growth !== undefined && (
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        recentData.collectionsGrowth.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <span>{Math.abs(recentData.collectionsGrowth.growth).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
                {recentData.collectionsGrowth.trend && recentData.collectionsGrowth.trend.length > 0 && (
                  <div className="h-48">
                    <Line
                      data={{
                        labels: recentData.collectionsGrowth.trend.map((item) => item.date),
                        datasets: [
                          {
                            label: 'Collections',
                            data: recentData.collectionsGrowth.trend.map((item) => item.count),
                            borderColor: 'rgb(37, 99, 235)',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            tension: 0.4,
                            fill: true,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            </ChartCard>
          )}

          {/* Recent Collections */}
          {isUser ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  My Collections Summary
                </h3>
                <button
                  onClick={() => navigate('/collections')}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View All
                </button>
              </div>
              
              {hasCollections(recentData) ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {getCollections(recentData).length}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Collections</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatNumber(
                          getCollections(recentData).reduce((sum, c) => sum + (c.totalWeight || 0), 0)
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Weight</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(
                          getCollections(recentData).reduce((sum, c) => sum + (c.totalAmount || 0), 0)
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Revenue</p>
                    </div>
                  </div>
                  
                  {/* Recent Collections List */}
                  <div className="space-y-2">
                    {getCollections(recentData).slice(0, DISPLAY_LIMITS.SUMMARY_COLLECTIONS).map((collection) => (
                      <div
                        key={collection._id}
                        onClick={() => navigate('/collections')}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {collection.locationName || 'Collection'}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {collection.collectionDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(collection.collectionDate, 'PP')}
                                </span>
                              )}
                              {collection.totalWeight && (
                                <span>{formatNumber(collection.totalWeight)} kg</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {collection.totalAmount && (
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(collection.totalAmount)}
                              </span>
                            )}
                            {collection.receiptNumber && (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {getCollections(recentData).length > DISPLAY_LIMITS.SUMMARY_COLLECTIONS && (
                    <button
                      onClick={() => navigate('/collections')}
                      className="w-full text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors py-2"
                    >
                      View {getCollections(recentData).length - DISPLAY_LIMITS.SUMMARY_COLLECTIONS} more collections →
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No collections yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Your collections will appear here
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ChartCard title={isAgent ? "My Recent Collections" : "Recent Collections"}>
              <div className="space-y-3">
                {recentData.recentCollections && recentData.recentCollections.length > 0 ? (
                  recentData.recentCollections.slice(0, 8).map((collection) => (
                    <div
                      key={collection._id}
                      onClick={() => navigate('/collections')}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {collection.locationName || 'Collection'}
                          </p>
                          {collection.collectionDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(collection.collectionDate, 'PP')}
                            </p>
                          )}
                        </div>
                        {collection.receiptNumber && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Receipt
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4 text-gray-600 dark:text-gray-400">
                          {collection.totalWeight && (
                            <span>{formatNumber(collection.totalWeight)} kg</span>
                          )}
                          {collection.totalAmount && (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(collection.totalAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No recent collections</p>
                  </div>
                )}
              </div>
            </ChartCard>
          )}
        </div>

        {/* Recent Usage Chart - Only for Admin/Agent */}
        {recentData.recentUsage && !isUser && (
          <div className="mt-6">
            <ChartCard title={isAgent ? "My Recent Usage (Last 7 Days)" : "Recent Usage (Last 7 Days)"}>
              <div className="h-64">
                <Line
                  data={{
                    labels: recentData.recentUsage.last7Days.map((item) => item.date),
                    datasets: [
                      {
                        label: 'Collections',
                        data: recentData.recentUsage.last7Days.map((item) => item.collections),
                        borderColor: 'rgb(37, 99, 235)',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y',
                      },
                      {
                        label: 'Revenue (₹)',
                        data: recentData.recentUsage.last7Days.map((item) => item.revenue),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                          precision: 0,
                        },
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    },
                  }}
                />
              </div>
            </ChartCard>
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardRecentActivity;
