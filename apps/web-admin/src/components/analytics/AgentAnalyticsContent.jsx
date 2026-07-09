import { memo } from 'react';
import { Trophy, TrendingUp, Users, Package, IndianRupee } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import Loader from '../shared/Loader';
import { formatDate } from '../../utils/formatDate';
import '../../utils/chartConfig'; // Ensure Chart.js is registered

const AgentAnalyticsContent = memo(({ 
  analytics, 
  dateRangeType, 
  setDateRangeType, 
  customDateRange, 
  setCustomDateRange, 
  selectedLeaderboard, 
  setSelectedLeaderboard, 
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
        <p className="font-semibold mb-2">Failed to load agent analytics</p>
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
  const leaderboardData = analytics.leaderboard?.[selectedLeaderboard] || [];
  const leaderboardLabels = leaderboardData.length > 0
    ? leaderboardData.map(item => item.agentName || 'Unknown')
    : ['No Data'];
  const leaderboardValues = leaderboardData.length > 0
    ? leaderboardData.map(item => item.value || 0)
    : [0];

  const allTrends = analytics.agents?.flatMap(agent => 
    agent.performanceTrend?.map(trend => ({
      date: trend.date,
      collections: trend.collections || 0,
    })) || []
  ) || [];

  const trendsByDate = {};
  allTrends.forEach(trend => {
    if (trend.date) {
      if (!trendsByDate[trend.date]) {
        trendsByDate[trend.date] = 0;
      }
      trendsByDate[trend.date] += trend.collections;
    }
  });

  const trendDates = Object.keys(trendsByDate).sort();
  const trendValues = trendDates.map(date => trendsByDate[date]);

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
            <Users className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Agents
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.agents?.length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Collections
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.agents?.reduce((sum, agent) => sum + (agent.totalCollections || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <IndianRupee className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Revenue
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(analytics.agents?.reduce((sum, agent) => sum + (agent.totalRevenue || 0), 0) || 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Avg Collections/Day
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.agents?.length 
              ? (analytics.agents.reduce((sum, agent) => sum + (agent.collectionsPerDay || 0), 0) / analytics.agents.length).toFixed(1)
              : '0.0'}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </h3>
          <select
            value={selectedLeaderboard}
            onChange={(e) => setSelectedLeaderboard(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="byCollections">By Collections</option>
            <option value="byRevenue">By Revenue</option>
            <option value="byWeight">By Weight</option>
          </select>
        </div>
        {leaderboardData.length > 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Bar
              data={{
                labels: leaderboardLabels,
                datasets: [{
                  label: selectedLeaderboard === 'byCollections' ? 'Collections' :
                         selectedLeaderboard === 'byRevenue' ? 'Revenue (₹)' : 'Weight (kg)',
                  data: leaderboardValues,
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  borderColor: 'rgba(59, 130, 246, 1)',
                  borderWidth: 1,
                }],
              }}
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
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.x;
                        return `${label}: ${value}`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No leaderboard data available
          </div>
        )}
      </div>

      {/* Performance Trends */}
      {trendDates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Combined Performance Trends
          </h3>
          <div className="h-96 flex items-center justify-center">
            <Line
              data={{
                labels: trendDates.length > 0
                  ? trendDates.map(date => formatDate(date, 'MMM d'))
                  : ['No Data'],
                datasets: [{
                  label: 'Total Collections',
                  data: trendValues.length > 0 ? trendValues : [0],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true,
                }],
              }}
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
        </div>
      )}

      {/* Performance Insights - Simplified */}
      {analytics.agents && analytics.agents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Performance Insights
          </h3>
          <div className="space-y-3">
            {analytics.agents
              .filter(agent => agent.comparison && (
                agent.comparison.collectionsVsAverage < -10 ||
                agent.comparison.revenueVsAverage < -10 ||
                agent.comparison.collectionsPerDayVsAverage < -10
              ))
              .slice(0, 5)
              .map((agent, index) => {
                const recommendations = [];
                if (agent.comparison?.collectionsVsAverage < -10) {
                  recommendations.push(`Collections are ${Math.abs(agent.comparison.collectionsVsAverage).toFixed(1)}% below team average`);
                }
                if (agent.comparison?.revenueVsAverage < -10) {
                  recommendations.push(`Revenue is ${Math.abs(agent.comparison.revenueVsAverage).toFixed(1)}% below team average`);
                }
                if (agent.comparison?.collectionsPerDayVsAverage < -10) {
                  recommendations.push(`Collections per day is ${Math.abs(agent.comparison.collectionsPerDayVsAverage).toFixed(1)}% below team average`);
                }
                
                if (recommendations.length === 0) return null;
                
                return (
                  <div key={index} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">{agent.agentName}</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            {analytics.agents.filter(agent => agent.comparison && (
              agent.comparison.collectionsVsAverage < -10 ||
              agent.comparison.revenueVsAverage < -10 ||
              agent.comparison.collectionsPerDayVsAverage < -10
            )).length === 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All agents are performing at or above team average. Great job!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Averages - Simplified */}
      {analytics.teamAverages && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Team Averages
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Collections</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.teamAverages.averageCollections?.toFixed(1) || '0.0'}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.teamAverages.averageRevenue || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Weight</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.teamAverages.averageWeight?.toFixed(2) || '0.00'} kg
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Collections/Day</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.teamAverages.averageCollectionsPerDay?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Collection Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.teamAverages.averageCollectionValue || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agent Details Table - Simplified */}
      {analytics.agents && analytics.agents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Agent Performance Details
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Collections</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Weight (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Collections/Day</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.agents.map((agent, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {agent.agentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {agent.totalCollections || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(agent.totalRevenue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(agent.totalWeight || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(agent.collectionsPerDay || 0).toFixed(2)}
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

AgentAnalyticsContent.displayName = 'AgentAnalyticsContent';

export default AgentAnalyticsContent;
