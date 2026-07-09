import { memo, useMemo } from 'react';
import { FileText, Trash2, Receipt, Download, Edit, UserCog } from 'lucide-react';
import Table from '../data/Table';
import Button from '../shared/Button';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { getLocationTypeLabel, getMaterialTypeLabel } from '../../types/collections';
import { isAdmin } from '../../utils/permissionUtils';
import { USER_ROLES } from '../../utils/constants';

/**
 * CollectionTable Component
 * Displays collections in a table format with actions
 */
const CollectionTable = memo(({
  collections,
  user,
  onEdit,
  onDelete,
  onTransfer,
  onGenerateReceipt,
  onPrintReceipt,
  onDownloadReceipt,
}) => {
  const columns = useMemo(() => [
    {
      key: 'receiptNumber',
      label: 'Receipt #',
      render: (receiptNumber) => (
        <span className="text-gray-900 dark:text-white font-mono text-sm">
          {receiptNumber || '-'}
        </span>
      ),
    },
    {
      key: 'locationType',
      label: 'Location Type',
      render: (type) => (
        <span className="text-gray-900 dark:text-white capitalize">
          {getLocationTypeLabel(type)}
        </span>
      ),
    },
    {
      key: 'locationName',
      label: 'Location Name',
      render: (name) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {name || '-'}
        </span>
      ),
    },
    {
      key: 'locationId',
      label: 'Locality',
      render: (locationId) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {locationId?.locality || '-'}
        </span>
      ),
    },
    {
      key: 'collectionItems',
      label: 'Items',
      render: (items) => (
        <div className="space-y-1">
          {items?.map((item, idx) => (
            <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
              {getMaterialTypeLabel(item.materialType)}: {item.weight} kg @ {formatCurrency(item.rate, { maximumFractionDigits: 2 })}/kg
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'totalWeight',
      label: 'Total Weight',
      render: (weight) => (
        <span className="text-gray-900 dark:text-white font-medium">
          {weight ? `${weight.toFixed(2)} kg` : '-'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      render: (amount) => (
        <span className="text-gray-900 dark:text-white font-semibold">
          {amount ? formatCurrency(amount, { maximumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    {
      key: 'collectionDate',
      label: 'Collection Date',
      render: (date) => formatDate(date, 'PP'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, collection) => (
        <div className="flex gap-2">
          {/* Users can only view, not edit/delete/create receipts */}
          {user?.role !== USER_ROLES.USER && !collection.receiptNumber && (
            <>
              <Button
                onClick={() => onEdit(collection)}
                variant="ghost"
                size="sm"
                className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                title="Edit Collection"
                icon={Edit}
              />
              <Button
                onClick={() => onDelete(collection._id)}
                variant="ghost"
                size="sm"
                className="p-2 bg-red-100 hover:bg-red-200 text-red-600"
                title="Delete Collection"
                icon={Trash2}
              />
              {isAdmin(user) && (
                <Button
                  onClick={() => onTransfer(collection._id)}
                  variant="ghost"
                  size="sm"
                  className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600"
                  title="Transfer Collection"
                  icon={UserCog}
                />
              )}
              <Button
                onClick={() => onGenerateReceipt(collection._id)}
                variant="ghost"
                size="sm"
                className="p-2 bg-green-100 hover:bg-green-200 text-green-600"
                title="Generate Receipt"
                icon={Receipt}
              />
            </>
          )}
          {/* All users can view/download receipts */}
          {collection.receiptNumber && (
            <>
              <Button
                onClick={() => onPrintReceipt(collection._id)}
                variant="ghost"
                size="sm"
                className="p-2 bg-primary-100 hover:bg-primary-200 text-primary-600"
                title="Print Receipt PDF"
                icon={FileText}
              />
              <Button
                onClick={() => onDownloadReceipt(collection._id)}
                variant="ghost"
                size="sm"
                className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600"
                title="Download Receipt PDF"
                icon={Download}
              />
            </>
          )}
        </div>
      ),
    },
  ], [user, onEdit, onDelete, onTransfer, onGenerateReceipt, onPrintReceipt, onDownloadReceipt]);

  if (collections.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No collections found
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Create a new collection to get started.
        </p>
      </div>
    );
  }

  return <Table columns={columns} data={collections} />;
});

CollectionTable.displayName = 'CollectionTable';

export default CollectionTable;
