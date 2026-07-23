import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Trophy, TrendingUp, IndianRupee, Package, Activity } from 'lucide-react';
import Skeleton from '../components/shared/Skeleton';
import { Bar, Line } from 'react-chartjs-2';
import { formatCurrency } from '../utils/formatCurrency';
import { useAnalytics } from '../hooks';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AgentPerformance = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse filters from URL
  const filters = useMemo(() => ({
    dateRangeType: searchParams.get('dateRangeType') || 'lastMonth',
    selectedLeaderboard: searchParams.get('selectedLeaderboard') || 'byCollections',
    customStartDate: searchParams.get('customStartDate') || '',
    customEndDate: searchParams.get('customEndDate') || '',
  }), [searchParams]);

  // Custom date range object for useAnalytics hook
  const customDateRange = useMemo(() => ({
    startDate: filters.customStartDate || undefined,
    endDate: filters.customEndDate || undefined,
  }), [filters.customStartDate, filters.customEndDate]);

  // Use useAnalytics hook for data fetching
  const { data: analytics, loading, error } = useAnalytics('agent', {
    dateRangeType: filters.dateRangeType,
    customDateRange,
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

  const handleLeaderboardChange = useCallback((value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('selectedLeaderboard', value);
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
      case 'lastMonth':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      case '6months':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(now).toISOString().split('T')[0];
        break;
      default:
        startDate = '';
        endDate = '';
    }
    
    return { startDate, endDate };
  }, [filters.dateRangeType, filters.customStartDate, filters.customEndDate]);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="200px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
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

  // Leaderboard data
  const leaderboardData = analytics.leaderboard[filters.selectedLeaderboard] || [];
  const leaderboardLabels = leaderboardData.map(item => item.agentName);
  const leaderboardValues = leaderboardData.map(item => item.value);

  // Agent performance trends (aggregate all agents)
  const allTrends = (analytics.agents || []).flatMap(agent =>
    (Array.isArray(agent.performanceTrend) ? agent.performanceTrend : []).map(trend => ({
      date: trend.date,
      agentName: agent.agentName,
      collections: trend.collections,
    }))
  );

  // Group by date
  const trendsByDate = {};
  allTrends.forEach(trend => {
    if (!trendsByDate[trend.date]) {
      trendsByDate[trend.date] = 0;
    }
    trendsByDate[trend.date] += trend.collections;
  });

  const trendDates = Object.keys(trendsByDate).sort();
  const trendValues = trendDates.map(date => trendsByDate[date]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agent Performance Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track and compare agent productivity and performance
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <select
              value={filters.dateRangeType}
              onChange={(e) => handleDateRangeChange(e.target.value, dateRange.startDate, dateRange.endDate)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="lastMonth">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last 1 Year</option>
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
            {analytics.agents.length}
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
            {analytics.agents.reduce((sum, agent) => sum + agent.totalCollections, 0)}
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
            {formatCurrency(analytics.agents.reduce((sum, agent) => sum + agent.totalRevenue, 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Avg Collections/Day
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(analytics.agents.reduce((sum, agent) => sum + agent.collectionsPerDay, 0) / analytics.agents.length || 0).toFixed(1)}
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
            value={filters.selectedLeaderboard}
            onChange={(e) => handleLeaderboardChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="byCollections">By Collections</option>
            <option value="byRevenue">By Revenue</option>
            <option value="byWeight">By Weight</option>
          </select>
        </div>
        {leaderboardData.length > 0 ? (
          <div className="h-64">
            <Bar
              data={{
                labels: leaderboardLabels,
                datasets: [{
                  label: filters.selectedLeaderboard === 'byCollections' ? 'Collections' :
                         filters.selectedLeaderboard === 'byRevenue' ? 'Revenue (₹)' : 'Weight (kg)',
                  data: leaderboardValues,
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  borderColor: 'rgba(59, 130, 246, 1)',
                  borderWidth: 1,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                  x: {
                    beginAtZero: true,
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
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
          <div className="h-96">
            <Line
              data={{
                labels: trendDates,
                datasets: [{
                  label: 'Total Collections',
                  data: trendValues,
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Agent Details Table */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Collections/Day</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {(analytics.agents || []).map((agent, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {agent.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {agent.totalCollections}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(agent.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {agent.totalWeight.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(agent.averageCollectionValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {agent.collectionsPerDay.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const AgentPerformanceWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Agent Performance"
      message="Something went wrong while loading the agent performance page. Please try refreshing the page."
    >
      <AgentPerformance />
    </ErrorBoundary>
  );
};

export default AgentPerformanceWithErrorBoundary;

