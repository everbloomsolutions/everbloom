// src/components/data/TableCard.jsx
// Mobile-friendly card view for table data
import EmptyState from '../shared/EmptyState';
import { Package } from 'lucide-react';

const TableCard = ({ columns, data, onRowClick }) => {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No data available"
        description="There are no items to display."
      />
    );
  }

  return (
    <div className="space-y-4">
      {(data || []).map((row, rowIndex) => (
        <div
          key={row._id || row.id || rowIndex}
          onClick={() => onRowClick && onRowClick(row)}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${
            onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
          }`}
        >
          {columns.map((column) => {
            const value = row[column.key];
            const displayValue = column.render ? column.render(value, row) : value;
            
            return (
              <div
                key={column.key}
                className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {column.label}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 text-right flex-1 ml-4">
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default TableCard;
