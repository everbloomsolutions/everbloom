import { memo, useState, useEffect, useCallback } from 'react';
import { Filter, X } from 'lucide-react';
import SelectInput from '../forms/SelectInput';
import FormInput from '../forms/FormInput';
import SearchBar from '../forms/SearchBar';
import Button from '../shared/Button';

const ENTITY_TYPES = [
  { value: 'project', label: 'Project' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'user', label: 'User' },
  { value: 'location', label: 'Location' },
  { value: 'contact', label: 'Contact' },
];

const ACTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'receipt_generated', label: 'Receipt Generated' },
  { value: 'transferred', label: 'Transferred' },
];

const AuditLogFilters = memo(({ filters, updateFilter, clearFilters, onSearch }) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.entityType !== '' ||
    filters.action !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    clearFilters();
  }, [clearFilters]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectInput
          label="Entity Type"
          name="entityType"
          value={filters.entityType}
          onChange={(e) => updateFilter('entityType', e.target.value)}
          options={ENTITY_TYPES}
          placeholder="All Types"
        />
        <SelectInput
          label="Action"
          name="action"
          value={filters.action}
          onChange={(e) => updateFilter('action', e.target.value)}
          options={ACTIONS}
          placeholder="All Actions"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <SearchBar
            onSearch={onSearch}
            placeholder="Search descriptions..."
            value={searchInput}
            onChange={handleSearchChange}
            minSearchLength={2}
          />
        </div>
        <FormInput
          label="Start Date"
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={(e) => updateFilter('startDate', e.target.value)}
          max={filters.endDate || undefined}
        />
        <FormInput
          label="End Date"
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={(e) => updateFilter('endDate', e.target.value)}
          min={filters.startDate || undefined}
        />
        <div className="flex items-end">
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            fullWidth
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Filter className="w-4 h-4" />
            <span>Filters active</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
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

AuditLogFilters.displayName = 'AuditLogFilters';

export default AuditLogFilters;
