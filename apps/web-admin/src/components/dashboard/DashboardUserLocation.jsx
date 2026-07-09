import { MapPin } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

/**
 * Dashboard User Location Component
 * Displays allocated location details for the User role
 */
const DashboardUserLocation = ({ defaultLocation }) => {
  if (!defaultLocation) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        My Allocated Location
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900 flex-shrink-0">
            <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {defaultLocation.locationName}
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {defaultLocation.address && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Address:</span>
                  <span className="flex-1">{defaultLocation.address}</span>
                </div>
              )}
              {(defaultLocation.city || defaultLocation.state) && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Location:</span>
                  <span className="flex-1">
                    {[defaultLocation.city, defaultLocation.state, defaultLocation.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {defaultLocation.locationType && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Type:</span>
                  <span className="flex-1 capitalize">
                    {defaultLocation.locationType.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              )}
              {defaultLocation.usageCount !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Usage:</span>
                  <span className="flex-1">
                    {defaultLocation.usageCount} collection{defaultLocation.usageCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {defaultLocation.lastUsedAt && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Last Used:</span>
                  <span className="flex-1">
                    {formatDate(defaultLocation.lastUsedAt, 'PP')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardUserLocation;
