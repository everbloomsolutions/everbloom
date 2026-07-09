import { Activity, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatNumber } from '../../utils/formatNumber';

/**
 * Dashboard Insights Component
 * Displays role-specific insights and suggestions
 */
const DashboardInsights = ({ todayData, isUser, isAgent, navigate }) => {
  if (!todayData || (!isUser && !isAgent)) return null;

  const collections = todayData?.today?.collections || {};
  const revenue = todayData?.today?.revenue || {};
  const collectionsCount = Number(collections.count ?? 0) || 0;
  const totalWeight = Number(collections.totalWeight ?? 0) || 0;
  const revenueTotal = Number(revenue.total ?? 0) || 0;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isUser ? 'My Insights' : 'Performance Insights'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            {isUser ? "Today's Summary" : "Today's Performance"}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Collections</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {collectionsCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Weight</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatNumber(totalWeight)} kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
              <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                {formatCurrency(revenueTotal)}
              </span>
            </div>
            {isAgent && collectionsCount > 0 && (
              <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg. per Collection</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(revenueTotal / collectionsCount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Suggestions
          </h3>
          <div className="space-y-3">
            {collectionsCount === 0 ? (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {isUser
                    ? "You haven't made any collections today. Start by requesting a collection!"
                    : "No collections recorded today. Create your first collection to get started!"}
                </p>
              </div>
            ) : Number(collections.withoutReceipt ?? 0) > 0 ? (
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <p className="text-sm text-primary-800 dark:text-primary-200 mb-2">
                  {Number(collections.withoutReceipt ?? 0)} collection{Number(collections.withoutReceipt ?? 0) > 1 ? 's' : ''} without receipt
                </p>
                <button
                  onClick={() => navigate('/collections')}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Generate receipts →
                </button>
              </div>
            ) : (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Great job! All collections have receipts.
                </p>
              </div>
            )}

            {isAgent && collectionsCount > 5 && (
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <p className="text-sm text-primary-800 dark:text-primary-200">
                  Excellent performance today! You&apos;ve completed {collectionsCount} collections.
                </p>
              </div>
            )}

            {revenueTotal > 0 && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {isUser
                    ? `You've earned ${formatCurrency(revenueTotal)} today!`
                    : `Total revenue today: ${formatCurrency(revenueTotal)}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardInsights;
