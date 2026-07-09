import { memo } from 'react';
import TableCard from './TableCard';
import EmptyState from '../shared/EmptyState';
import { Package } from 'lucide-react';

// Import react-window - if it fails, we'll use regular table
let FixedSizeList = null;
try {
  const reactWindow = require('react-window');
  FixedSizeList = reactWindow.FixedSizeList || reactWindow.default?.FixedSizeList;
} catch (_e) {
  // react-window not available - will fallback to regular table
}

/**
 * Virtualized Table Component
 *
 * Automatically uses virtualization for large lists (50+ rows) to improve performance.
 * Falls back to regular table rendering for smaller lists.
 */
const VirtualizedTable = memo(({ columns, data, onRowClick, virtualizeThreshold = 50 }) => {
  const shouldVirtualize = data.length >= virtualizeThreshold;
  const rowHeight = 60; // Approximate row height in pixels

  // Render a single table row
  const Row = ({ index, style }) => {
    const row = data[index];
    return (
      <div
        style={style}
        onClick={() => onRowClick && onRowClick(row)}
        className={`flex border-b border-gray-200 dark:border-gray-700 ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
          }`}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 flex-1"
            style={{ minWidth: '150px' }}
          >
            {column.render ? column.render(row[column.key], row) : row[column.key]}
          </div>
        ))}
      </div>
    );
  };

  // Regular table for small lists or mobile
  const RegularTable = () => (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="No data available"
                    description="There are no items to display."
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row._id || row.id || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <TableCard columns={columns} data={data} onRowClick={onRowClick} />
      </div>
    </>
  );

  // Virtualized table for large lists
  const VirtualizedTableContent = () => {
    if (!FixedSizeList) {
      // Fallback to regular table if react-window is not available
      return <RegularTable />;
    }

    return (
      <>
        {/* Desktop Virtualized Table View */}
        <div className="hidden md:block overflow-x-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
            {data.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Package}
                  title="No data available"
                  description="There are no items to display."
                />
              </div>
            ) : (
              <div style={{ height: Math.min(600, data.length * rowHeight), overflow: 'auto' }}>
                <FixedSizeList
                  height={Math.min(600, data.length * rowHeight)}
                  itemCount={data.length}
                  itemSize={rowHeight}
                  width="100%"
                >
                  {Row}
                </FixedSizeList>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Card View - Always use regular rendering */}
        <div className="md:hidden">
          <TableCard columns={columns} data={data} onRowClick={onRowClick} />
        </div>
      </>
    );
  };

  if (!shouldVirtualize) {
    return <RegularTable />;
  }

  return <VirtualizedTableContent />;
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  if (prevProps.data.length !== nextProps.data.length) return false;
  if (prevProps.columns.length !== nextProps.columns.length) return false;
  if (prevProps.onRowClick !== nextProps.onRowClick) return false;
  if (prevProps.virtualizeThreshold !== nextProps.virtualizeThreshold) return false;

  // Shallow compare data array
  for (let i = 0; i < prevProps.data.length; i++) {
    if (prevProps.data[i] !== nextProps.data[i]) return false;
  }

  return true;
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;
