import { useState, memo, useMemo } from 'react';
import SearchBar from '../forms/SearchBar';
import { COLLECTION_LOCATION_OPTIONS } from '../../types/collections';

/**
 * LocationsFilters Component
 * Handles all filtering UI for locations page
 */
const LocationsFilters = memo(({
  filters,
  updateFilter,
  clearFilters,
  onSearch,
  showAdvancedFilters: externalShowAdvanced,
  onToggleAdvancedFilters,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(externalShowAdvanced || false);

  const handleToggleAdvanced = () => {
    const newValue = !showAdvancedFilters;
    setShowAdvancedFilters(newValue);
    if (onToggleAdvancedFilters) {
      onToggleAdvancedFilters(newValue);
    }
  };

  const hasActiveFilters = useMemo(() => 
    filters.locationType !== 'all' ||
    filters.status !== 'all' ||
    filters.city ||
    filters.state ||
    filters.sortBy !== 'newest',
    [filters]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search Locality
          </label>
          <SearchBar
            onSearch={onSearch}
            placeholder="Search by locality..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Location Type
          </label>
          <select
            value={filters.locationType}
            onChange={(e) => updateFilter('locationType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Types</option>
            {COLLECTION_LOCATION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="newest">Newest First</option>
            <option value="mostUsed">Most Used</option>
            <option value="recentlyUsed">Recently Used</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handleToggleAdvanced}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {showAdvancedFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              City
            </label>
            <input
              type="text"
              value={filters.city || ''}
              onChange={(e) => updateFilter('city', e.target.value)}
              placeholder="Filter by city"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              State
            </label>
            <input
              type="text"
              value={filters.state || ''}
              onChange={(e) => updateFilter('state', e.target.value)}
              placeholder="Filter by state"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
});

LocationsFilters.displayName = 'LocationsFilters';

export default LocationsFilters;
