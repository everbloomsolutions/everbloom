import { useState, useCallback } from 'react';
import logger from '../../utils/logger';

/**
 * Custom hook for optimistic updates pattern
 * 
 * @param {Function} updateFn - Async function that performs the update
 * @param {Function} onSuccess - Callback on successful update
 * @param {Function} onError - Callback on error (receives error and rollback function)
 * @param {Object} options - Options object
 * @param {boolean} options.enableOptimistic - Enable optimistic updates (default: true)
 * @param {Function} options.getOptimisticData - Function to generate optimistic data
 * @returns {Object} { execute, isUpdating, error }
 */
export const useOptimisticUpdate = (updateFn, onSuccess, onError, options = {}) => {
  const {
    enableOptimistic = true,
    getOptimisticData = null,
  } = options;

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [rollbackData, setRollbackData] = useState(null);

  const execute = useCallback(async (data, optimisticData = null) => {
    setIsUpdating(true);
    setError(null);

    // Store original data for rollback if needed
    let originalData = null;
    if (enableOptimistic && optimisticData !== null) {
      originalData = optimisticData;
    } else if (enableOptimistic && getOptimisticData) {
      originalData = getOptimisticData(data);
    }

    try {
      // Perform the update
      const result = await updateFn(data);

      // Success - clear rollback data
      setRollbackData(null);

      if (onSuccess) {
        onSuccess(result, data);
      }

      return { success: true, data: result };
    } catch (err) {
      logger.error('Optimistic update failed:', err);

      // Store error and rollback data
      setError(err);
      setRollbackData(originalData);

      // Call error handler with rollback function
      if (onError) {
        onError(err, () => {
          // Rollback function - restore original data
          if (originalData !== null) {
            logger.debug('Rolling back optimistic update');
            setRollbackData(null);
            // The caller should handle the actual rollback
            return originalData;
          }
          return null;
        });
      }

      return { success: false, error: err, rollback: originalData };
    } finally {
      setIsUpdating(false);
    }
  }, [updateFn, onSuccess, onError, enableOptimistic, getOptimisticData]);

  return {
    execute,
    isUpdating,
    error,
    rollbackData,
  };
};

export default useOptimisticUpdate;
