import { Activity, Clock, TrendingUp, UserCog, MapPin } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

/**
 * Dashboard Performance Metrics Component
 * Displays performance metrics for Admin and Agent roles
 */
const DashboardPerformanceMetrics = ({ performanceData, isAdmin, isAgent, assignedLocations }) => {
  if (!performanceData || (isAdmin === false && isAgent === false)) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isAgent ? 'My Performance Metrics' : "Today's Performance Metrics"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Collections per Hour
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {performanceData.collectionsPerHour}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900">
              <Clock className="w-6 h-6 text-pink-600 dark:text-pink-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Peak Activity Time
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {performanceData.peakActivityTime}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-teal-100 dark:bg-teal-900">
              <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Revenue per Collection
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(performanceData.revenuePerCollection)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Agents (Admin/Super Admin only) */}
      {isAdmin && performanceData.activeAgents && performanceData.activeAgents.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Active Agents Today
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData.activeAgents.map((agent) => (
              <div
                key={agent.agentId}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white mb-2">{agent.agentName}</p>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Collections:</span>
                    <span className="font-medium">{agent.collections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium">{formatCurrency(agent.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Locations */}
      {performanceData.activeLocations && performanceData.activeLocations.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {isAgent ? 'My Active Locations Today' : 'Active Locations Today'}
          </h3>
          {isAgent && assignedLocations.length > 0 && (
            <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                <strong>Assigned Locations:</strong> {assignedLocations.length} location{assignedLocations.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isAgent && assignedLocations.length > 0
              ? performanceData.activeLocations.filter(loc => 
                  assignedLocations.some(al => al.locationName === loc.locationName)
                )
              : performanceData.activeLocations
            ).slice(0, 9).map((location, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white mb-2">{location.locationName}</p>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Collections:</span>
                    <span className="font-medium">{location.collections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium">{formatCurrency(location.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {isAgent && assignedLocations.length > 0 && 
           performanceData.activeLocations.filter(loc => 
             assignedLocations.some(al => al.locationName === loc.locationName)
           ).length === 0 && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No active collections from your assigned locations today</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPerformanceMetrics;
