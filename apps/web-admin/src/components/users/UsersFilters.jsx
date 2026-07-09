import { memo, useCallback, useEffect, useState } from 'react';
import SearchBar from '../forms/SearchBar';
import Button from '../shared/Button';
import { X, Filter } from 'lucide-react';

/**
 * UsersFilters Component
 * Handles all filtering UI for users page
 */
const UsersFilters = memo(({
  filters,
  updateFilter,
  clearFilters,
  onSearch,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.role !== '' ||
    filters.isActive !== undefined;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <SearchBar
            onSearch={onSearch}
            placeholder="Search users by name or email..."
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role
          </label>
          <select
            value={filters.role}
            onChange={(e) => updateFilter('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('isActive', value === 'all' ? undefined : value === 'active');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Filter className="w-4 h-4" />
            <span>Filters active</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              clearFilters();
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
});

UsersFilters.displayName = 'UsersFilters';

export default UsersFilters;
