import { memo } from 'react';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { Pie, Bar } from 'react-chartjs-2';
import Loader from '../shared/Loader';
import '../../utils/chartConfig'; // Ensure Chart.js is registered

const UserAnalyticsContent = memo(({ analytics, loading, error }) => {
  if (loading && !analytics) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 dark:text-red-400 py-8">
        <p className="font-semibold mb-2">Failed to load user analytics</p>
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
  const activeUsers = analytics.active || 0;
  const inactiveUsers = analytics.inactive || 0;
  const hasData = activeUsers > 0 || inactiveUsers > 0;

  // Prepare chart data for user status distribution
  const statusPieData = {
    labels: hasData ? ['Active Users', 'Inactive Users'] : ['No Data'],
    datasets: [{
      data: hasData ? [activeUsers, inactiveUsers] : [1],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(239, 68, 68, 1)',
      ],
      borderWidth: 1,
    }],
  };

  // Calculate percentages
  const totalUsers = analytics.total || 0;
  const activePercentage = totalUsers > 0 ? ((analytics.active || 0) / totalUsers * 100).toFixed(1) : 0;
  const inactivePercentage = totalUsers > 0 ? ((analytics.inactive || 0) / totalUsers * 100).toFixed(1) : 0;

  return (
    <div>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.total || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {analytics.users || analytics.total || 0} regular users
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Active Users
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {analytics.active || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activePercentage}% of total
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <UserX className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Inactive Users
          </h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {analytics.inactive || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {inactivePercentage}% of total
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
            Recent Users
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.recent || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last 7 days
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            User Status Distribution
          </h3>
          {hasData ? (
            <div className="h-64 flex items-center justify-center">
              <Pie 
                data={statusPieData} 
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
                          const total = activeUsers + inactiveUsers;
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
              No user status data available
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            User Status Overview
          </h3>
          {hasData ? (
            <div className="h-64 flex items-center justify-center">
              <Bar
                data={{
                  labels: ['Total', 'Active', 'Inactive'],
                  datasets: [{
                    label: 'Users',
                    data: [
                      analytics.total || 0,
                      analytics.active || 0,
                      analytics.inactive || 0,
                    ],
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(16, 185, 129, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                    ],
                    borderColor: [
                      'rgba(59, 130, 246, 1)',
                      'rgba(16, 185, 129, 1)',
                      'rgba(239, 68, 68, 1)',
                    ],
                    borderWidth: 1,
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
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `Users: ${context.parsed.y}`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No user data available
            </div>
          )}
        </div>
      </div>

      {/* User Statistics Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          User Statistics Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Total Users</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.total || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Active Users</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analytics.active || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Inactive Users</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {analytics.inactive || 0}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">New Users (7 days)</span>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {analytics.recent || 0}
              </span>
            </div>
            {analytics.users !== undefined && (
              <div className="flex justify-between items-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Regular Users</span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {analytics.users || 0}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Activation Rate</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {activePercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

UserAnalyticsContent.displayName = 'UserAnalyticsContent';

export default UserAnalyticsContent;
