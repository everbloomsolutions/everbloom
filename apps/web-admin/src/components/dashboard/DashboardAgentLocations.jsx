
import { DISPLAY_LIMITS } from '../../utils/dashboardHelpers';

/**
 * Dashboard Agent Locations Component
 * Displays assigned locations summary for Agent role
 */
const DashboardAgentLocations = ({ assignedLocations, navigate }) => {
  if (!assignedLocations || assignedLocations.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        My Assigned Locations
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Assigned Locations</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {assignedLocations.length}
            </p>
          </div>
          <button
            onClick={() => navigate('/locations')}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            View All →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {assignedLocations.slice(0, DISPLAY_LIMITS.ASSIGNED_LOCATIONS).map((location) => (
            <div
              key={location._id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                {location.locationName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {location.address}{location.city ? `, ${location.city}` : ''}
              </p>
              {location.usageCount !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used {location.usageCount} time{location.usageCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
        {assignedLocations.length > DISPLAY_LIMITS.ASSIGNED_LOCATIONS && (
          <button
            onClick={() => navigate('/locations')}
            className="w-full mt-4 text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors py-2"
          >
            View {assignedLocations.length - DISPLAY_LIMITS.ASSIGNED_LOCATIONS} more locations →
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardAgentLocations;
