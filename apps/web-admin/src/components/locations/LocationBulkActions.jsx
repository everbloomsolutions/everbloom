import { Trash } from 'lucide-react';
import Button from '../shared/Button';

/**
 * LocationBulkActions Component
 * Displays bulk action bar when locations are selected
 */
const LocationBulkActions = ({
  selectedCount,
  onBulkDeactivate,
  onBulkDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <span className="text-sm font-medium text-primary-900 dark:text-primary-200">
        {selectedCount} location(s) selected
      </span>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          onClick={onBulkDeactivate}
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto justify-center"
        >
          Deactivate Selected
        </Button>
        <Button
          onClick={onBulkDelete}
          variant="danger"
          size="sm"
          className="w-full sm:w-auto justify-center"
        >
          <Trash className="w-4 h-4 mr-2" />
          Delete Selected
        </Button>
        <button
          onClick={onClearSelection}
          className="px-3 py-2 min-h-[44px] text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 w-full sm:w-auto text-center"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default LocationBulkActions;
