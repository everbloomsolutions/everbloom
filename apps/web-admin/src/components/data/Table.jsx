import { memo } from 'react';
import TableCard from './TableCard';
import VirtualizedTable from './VirtualizedTable';
import EmptyState from '../shared/EmptyState';
import { Package } from 'lucide-react';

const Table = memo(({ columns, data, onRowClick, virtualizeThreshold = 50 }) => {
  // Use virtualization for large lists
  if (data.length >= virtualizeThreshold) {
    return <VirtualizedTable columns={columns} data={data} onRowClick={onRowClick} virtualizeThreshold={virtualizeThreshold} />;
  }

  // Regular table for smaller lists
  return (
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
            (data || []).map((row, rowIndex) => (
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
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  if (prevProps.data.length !== nextProps.data.length) return false;
  if (prevProps.columns.length !== nextProps.columns.length) return false;
  if (prevProps.onRowClick !== nextProps.onRowClick) return false;
  
  // Shallow compare data array
  for (let i = 0; i < prevProps.data.length; i++) {
    if (prevProps.data[i] !== nextProps.data[i]) return false;
  }
  
  return true;
});

Table.displayName = 'Table';

export default Table;
