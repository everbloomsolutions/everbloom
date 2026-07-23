import { memo, useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import Button from '../shared/Button';
import { COLLECTION_LOCATION_OPTIONS } from '../../types/collections';
import { isAdmin } from '../../utils/permissionUtils';

/**
 * CollectionFilters Component
 * Handles all filtering UI for collections page
 */
const CollectionFilters = memo(({
  filters,
  updateFilter,
  clearFilters,
  searchQuery,
  onSearchChange,
  timePeriod,
  onTimePeriodChange,
  onQuickDateRange,
  hasActiveFilters,
  agents = [],
  user,
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h2>
        {hasActiveFilters && (
          <Button
            onClick={clearFilters}
            variant="ghost"
            size="sm"
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
            icon={X}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {/* Time Period Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Time Period
          </label>
          <select
            value={timePeriod}
            onChange={(e) => onTimePeriodChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="lastWeek">Last Week</option>
            <option value="lastMonth">Last Month</option>
            <option value="last3Months">Last 3 Months</option>
          </select>
        </div>

        {/* Filter by Locality */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by Locality
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter by locality..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Location Type
          </label>
          <select
            value={filters.locationType}
            onChange={(e) => updateFilter('locationType', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Location Types</option>
            {COLLECTION_LOCATION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Collections</option>
            <option value="with-receipt">With Receipt</option>
            <option value="without-receipt">Without Receipt</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount (High to Low)</option>
            <option value="amount-low">Amount (Low to High)</option>
            <option value="weight-high">Weight (High to Low)</option>
            <option value="weight-low">Weight (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mb-4">
        <Button
          onClick={handleToggleAdvanced}
          variant="ghost"
          size="sm"
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          icon={Filter}
        >
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
          {/* Quick Date Range Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Date Range
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Button
                onClick={() => onQuickDateRange('today')}
                variant="outline"
                size="sm"
              >
                Today
              </Button>
              <Button
                onClick={() => onQuickDateRange('last-month')}
                variant="outline"
                size="sm"
              >
                Last Month
              </Button>
              <Button
                onClick={() => onQuickDateRange('last-3-months')}
                variant="outline"
                size="sm"
              >
                Last 3 Months
              </Button>
              <Button
                onClick={() => onQuickDateRange('last-6-months')}
                variant="outline"
                size="sm"
              >
                Last 6 Months
              </Button>
              <Button
                onClick={() => onQuickDateRange('last-year')}
                variant="outline"
                size="sm"
              >
                Last Year
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    updateFilter('startDate', e.target.value);
                    onTimePeriodChange('all'); // Reset to 'all' when manually setting dates
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    updateFilter('endDate', e.target.value);
                    onTimePeriodChange('all'); // Reset to 'all' when manually setting dates
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Agent Filter (Admin Only) */}
          {isAdmin(user) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Agent
              </label>
              <select
                value={filters.agentFilter}
                onChange={(e) => updateFilter('agentFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Agents</option>
                {(agents || []).map(agent => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} ({agent.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CollectionFilters.displayName = 'CollectionFilters';

export default CollectionFilters;
