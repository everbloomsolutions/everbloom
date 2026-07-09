import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import FormInput from '../forms/FormInput';
import Button from '../shared/Button';
import { Receipt, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const ReceiptGenerationModal = ({ isOpen, onClose, collection, onConfirm, isGenerating }) => {
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUpiTransactionId('');
      setError('');
    }
  }, [isOpen]);

  const validateUTR = (value) => {
    // Remove any non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Limit to 12 digits
    if (numericValue.length > 12) {
      return numericValue.slice(0, 12);
    }
    
    return numericValue;
  };

  const handleUTRChange = (e) => {
    const value = e.target.value;
    const cleaned = validateUTR(value);
    setUpiTransactionId(cleaned);
    
    if (error && cleaned.length === 12) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate UTR
    if (!upiTransactionId || upiTransactionId.length !== 12) {
      setError('UPI Transaction ID/UTR must be exactly 12 digits');
      return;
    }

    // Call onConfirm with UTR
    await onConfirm(upiTransactionId);
  };

  if (!collection) return null;

  // Calculate totals for display
  const totalWeight = collection.collectionItems?.reduce(
    (sum, item) => sum + (item.weight || 0),
    0
  ) || 0;
  
  const subTotal = collection.collectionItems?.reduce(
    (sum, item) => sum + ((item.weight || 0) * (item.rate || 0)),
    0
  ) || 0;
  
  const gstAmount = collection.gstAmount || 0;
  const totalAmount = collection.totalAmount || subTotal + gstAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Receipt"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Collection Details */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Collection Details</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Location:</span>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {collection.locationName || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {collection.collectionDate 
                  ? formatDate(collection.collectionDate, 'PP')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {totalWeight.toFixed(2)} kg
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <p className="font-medium text-primary-600 dark:text-primary-400 mt-1">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* UPI Transaction ID/UTR Input */}
        <div>
          <FormInput
            label="UPI Transaction ID/UTR"
            type="text"
            value={upiTransactionId}
            onChange={handleUTRChange}
            placeholder="Enter 12-digit UPI Transaction ID"
            required
            error={error}
            helperText="UPI transactions generate a 12-digit numeric code (e.g., 312345678901)"
            maxLength={12}
            pattern="[0-9]{12}"
          />
          
          {upiTransactionId.length > 0 && upiTransactionId.length < 12 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {12 - upiTransactionId.length} digit{12 - upiTransactionId.length !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">About UPI Transaction ID/UTR</p>
              <p className="text-xs">
                UPI transactions generate a 12-digit numeric code, which is technically a reference number that acts like a UTR for tracking. 
                Example: 312345678901 (Often starts with the year/date of the transaction)
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isGenerating}
            disabled={isGenerating || upiTransactionId.length !== 12}
            icon={Receipt}
          >
            Generate Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReceiptGenerationModal;
