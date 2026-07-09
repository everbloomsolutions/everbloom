import { memo, useMemo } from 'react';
import { Edit, Trash2, XCircle, CheckCircle } from 'lucide-react';
import Table from '../data/Table';
import { formatDate } from '../../utils/formatDate';
import { getLocationTypeLabel } from '../../types/collections';

/**
 * LocationsTable Component
 * Displays locations in a table format with actions
 */
const LocationsTable = memo(({
  locations,
  selectedLocations,
  onSelectLocation,
  onSelectAll,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
}) => {
  const columns = useMemo(() => [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={!!(selectedLocations.length === locations.length && locations.length > 0)}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
      ),
      render: (_, location) => (
        <input
          type="checkbox"
          checked={!!selectedLocations.includes(location._id)}
          onChange={(e) => onSelectLocation(location._id, e.target.checked)}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
      ),
    },
    {
      key: 'locationName',
      label: 'Name',
      render: (name, location) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {getLocationTypeLabel(location.locationType)}
          </div>
        </div>
      ),
    },
    {
      key: 'locality',
      label: 'Locality',
      render: (_, location) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{location.locality || '-'}</div>
          {(location.city || location.state) && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {[location.city, location.state].filter(Boolean).join(', ')}
              {location.zipCode && ` ${location.zipCode}`}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'usageCount',
      label: 'Usage',
      render: (count, location) => (
        <button
          onClick={() => onViewDetails(location._id)}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
        >
          {count || 0}
        </button>
      ),
    },
    {
      key: 'lastUsedAt',
      label: 'Last Used',
      render: (date) => (
        <div>
          {date ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(date)}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
              Never Used
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (isActive) => (
        <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
          isActive 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, location) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(location)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg dark:hover:bg-primary-900/20 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStatus(location._id, location.isActive, location.locationName)}
            className={`p-2 rounded-lg transition-colors ${
              location.isActive
                ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            title={location.isActive ? 'Deactivate' : 'Activate'}
          >
            {location.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(location._id, location.locationName)}
            disabled={location.usageCount > 0}
            className={`p-2 rounded-lg transition-colors ${
              location.usageCount > 0
                ? 'text-gray-400 cursor-not-allowed opacity-50'
                : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
            title={
              location.usageCount > 0
                ? `Cannot delete location with usage (${location.usageCount} collections). Please deactivate instead.`
                : 'Delete'
            }
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [
    selectedLocations,
    locations.length,
    onSelectAll,
    onSelectLocation,
    onViewDetails,
    onEdit,
    onToggleStatus,
    onDelete,
  ]);

  return (
    <div className="overflow-x-auto">
      <Table columns={columns} data={locations} />
    </div>
  );
});

LocationsTable.displayName = 'LocationsTable';

export default LocationsTable;
