import { Package, Receipt, IndianRupee, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatNumber } from '../../utils/formatNumber';
import { getChangeIndicatorProps } from '../../utils/dashboardHelpers';

/**
 * Dashboard Today Activity Component
 * Displays today's activity overview cards
 */
const DashboardTodayActivity = ({ todayData, isAdmin, isAgent, isUser }) => {
  const getChangeIndicator = (change) => {
    const props = getChangeIndicatorProps(change);
    if (!props) return null;
    const Icon = props.iconName === 'ArrowUp' ? ArrowUp : ArrowDown;
    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${props.color}`}>
        <Icon className="w-4 h-4" />
        <span>{props.value}%</span>
      </div>
    );
  };

  if (!todayData) return null;

  const collections = todayData?.today?.collections || {};
  const receipts = todayData?.today?.receipts || {};
  const revenue = todayData?.today?.revenue || {};
  const changes = todayData?.changes || {};

  const collectionsCount = Number(collections.count ?? 0) || 0;
  const collectionsTotalWeight = Number(collections.totalWeight ?? 0) || 0;
  const collectionsTotalRevenue = Number(collections.totalRevenue ?? 0) || 0;
  const collectionsWithReceipt = Number(collections.withReceipt ?? 0) || 0;
  const collectionsWithoutReceipt = Number(collections.withoutReceipt ?? 0) || 0;

  const receiptsCount = Number(receipts.count ?? 0) || 0;
  const receiptsTotalAmount = Number(receipts.totalAmount ?? 0) || 0;

  const revenueTotal = Number(revenue.total ?? 0) || 0;
  const revenueGst = Number(revenue.gst ?? 0) || 0;
  const revenueNet = Number(revenue.net ?? revenueTotal) || 0;
  const newUsersCount = Number(todayData?.today?.newUsers ?? 0) || 0;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isUser ? 'My Activity Today' : isAgent ? 'My Performance Today' : "Today's Activity Overview"}
      </h2>
        <div className={`grid grid-cols-1 ${isUser ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
        {/* Today's Collections */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <Package className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            {!isUser && getChangeIndicator(changes.collections)}
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {isUser ? 'My Collections' : isAgent ? 'My Collections' : "Today's Collections"}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {collectionsCount}
          </p>
          {collectionsCount === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No collections for your scope today.
            </p>
          ) : (
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Total Weight:</span>
                <span className="font-medium">{formatNumber(collectionsTotalWeight)} kg</span>
              </div>
              <div className="flex justify-between">
                <span>Total Revenue:</span>
                <span className="font-medium">{formatCurrency(collectionsTotalRevenue)}</span>
              </div>
              {collectionsCount > 0 && (
                <div className="flex justify-between">
                  <span>Avg. per Collection:</span>
                  <span className="font-medium">
                    {formatCurrency(collectionsTotalRevenue / collectionsCount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>With Receipt:</span>
                <span className="font-medium text-green-600">{collectionsWithReceipt}</span>
              </div>
              <div className="flex justify-between">
                <span>Without Receipt:</span>
                <span className="font-medium text-yellow-600">{collectionsWithoutReceipt}</span>
              </div>
            </div>
          )}
        </div>

        {/* Today's Receipts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900">
              <Receipt className="w-6 h-6 text-primary-600 dark:text-primary-300" />
            </div>
            {!isUser && getChangeIndicator(changes.receipts)}
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {isUser ? 'My Receipts' : isAgent ? 'My Receipts' : "Today's Receipts"}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {receiptsCount}
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">{formatCurrency(receiptsTotalAmount)}</span>
            </div>
            {receiptsCount > 0 && (
              <div className="flex justify-between mt-1">
                <span>Avg. per Receipt:</span>
                <span className="font-medium">
                  {formatCurrency(receiptsTotalAmount / receiptsCount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
              <IndianRupee className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            {!isUser && getChangeIndicator(changes.revenue)}
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {isUser ? 'My Revenue' : isAgent ? 'My Revenue' : "Today's Revenue"}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {formatCurrency(revenueTotal)}
          </p>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <div className="flex justify-between">
              <span>GST:</span>
              <span className="font-medium">{formatCurrency(revenueGst)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
              <span>Net Revenue:</span>
              <span className="font-medium">{formatCurrency(revenueNet || revenueTotal)}</span>
            </div>
          </div>
        </div>

        {/* Today's New Users (Admin only) */}
        {isAdmin && todayData?.today?.newUsers !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-300" />
              </div>
              {getChangeIndicator(changes.newUsers)}
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Today&apos;s New Users
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {newUsersCount}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTodayActivity;
