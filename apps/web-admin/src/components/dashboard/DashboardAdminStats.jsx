import { Users, Briefcase, TrendingUp } from 'lucide-react';
import ChartCard from '../data/ChartCard';
import { Line } from 'react-chartjs-2';
import { formatDate } from '../../utils/formatDate';

import { DISPLAY_LIMITS } from '../../utils/dashboardHelpers';

/**
 * Dashboard Admin Stats Component
 * Displays admin-specific statistics and charts
 */
const DashboardAdminStats = ({ stats, navigate }) => {
  if (!stats) return null;

  return (
    <>
      {/* Recent Users - Admin only */}
      {stats.recentUsers && stats.recentUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Users
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recentUsers.slice(0, DISPLAY_LIMITS.RECENT_USERS).map((user) => (
                <div
                  key={user._id}
                  onClick={() => navigate('/users')}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {user.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                      {user.role}
                    </span>
                    {user.createdAt && (
                      <span>{formatDate(user.createdAt, 'PP')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {stats.recentUsers.length > DISPLAY_LIMITS.RECENT_USERS && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigate('/users')}
                  className="w-full text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  View All Users ({stats.recentUsers.length} recent) →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Growth Chart - Admin only */}
      {stats.userGrowth && stats.userGrowth.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            User Growth (Last 12 Months)
          </h2>
          <ChartCard title="User Growth Trend">
            <div className="h-64">
              <Line
                data={{
                  labels: stats.userGrowth.map((item) => 
                    `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
                  ),
                  datasets: [
                    {
                      label: 'New Users',
                      data: stats.userGrowth.map((item) => item.count),
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
                      display: true,
                      position: 'top',
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
          </ChartCard>
        </div>
      )}

      {/* Legacy Stats (if new data not available) */}
      {!stats.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            {
              title: 'Total Users',
              value: stats?.overview?.totalUsers || 0,
              icon: Users,
              color: 'bg-primary-500',
            },
            {
              title: 'Total Collections',
              value: stats?.overview?.totalCollections || 0,
              icon: Briefcase,
              color: 'bg-green-500',
            },
            {
              title: 'Total Receipts',
              value: stats?.overview?.totalReceipts || 0,
              icon: TrendingUp,
              color: 'bg-orange-500',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${card.color} shadow-lg`}>
                  <card.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default DashboardAdminStats;
