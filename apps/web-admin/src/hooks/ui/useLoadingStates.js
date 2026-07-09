import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing multiple granular loading states
 * Useful for tracking loading states per action/section
 * 
 * @param {Array<string>} initialStates - Array of initial state keys
 * @returns {Object} { loadingStates, setLoading, isLoading, isAnyLoading }
 */
export const useLoadingStates = (initialStates = []) => {
  const [loadingStates, setLoadingStates] = useState(() => {
    const states = {};
    initialStates.forEach(key => {
      states[key] = false;
    });
    return states;
  });

  /**
   * Set loading state for a specific key
   * @param {string} key - State key
   * @param {boolean} value - Loading value
   */
  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Check if a specific key is loading
   * @param {string} key - State key
   * @returns {boolean}
   */
  const isLoading = useCallback((key) => {
    return loadingStates[key] === true;
  }, [loadingStates]);

  /**
   * Check if any state is loading
   * @returns {boolean}
   */
  const isAnyLoading = Object.values(loadingStates).some(state => state === true);

  /**
   * Set multiple loading states at once
   * @param {Object} states - Object with key-value pairs
   */
  const setMultipleLoading = useCallback((states) => {
    setLoadingStates(prev => ({
      ...prev,
      ...states,
    }));
  }, []);

  /**
   * Reset all loading states
   */
  const resetAll = useCallback(() => {
    setLoadingStates(prev => {
      const reset = {};
      Object.keys(prev).forEach(key => {
        reset[key] = false;
      });
      return reset;
    });
  }, []);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    setMultipleLoading,
    resetAll,
  };
};

/**
 * Hook for managing async operation with loading state
 * Wraps an async function with automatic loading state management
 * 
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} loadingKey - Key for loading state
 * @param {Object} options - Options
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @returns {Object} { execute, isLoading, error }
 */
export const useAsyncOperation = (asyncFn, _loadingKey = 'default', options = {}) => {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn(...args);
      if (onSuccess) {
        onSuccess(result);
      }
      return { success: true, data: result };
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, onSuccess, onError]);

  return {
    execute,
    isLoading,
    error,
  };
};

/**
 * Simplified useAsync hook for async operations with loading and error states
 * Based on design pattern for consistent async operation handling
 * 
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Options object
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {boolean} options.immediate - Execute immediately on mount (default: false)
 * @param {Array} options.deps - Dependencies array for immediate execution
 * @returns {Object} { execute, data, loading, error, reset }
 */
export const useAsync = (asyncFn, options = {}) => {
  const {
    onSuccess,
    onError,
    immediate = false,
    deps = [],
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn(...args);
      setData(result);
      if (onSuccess) {
        onSuccess(result);
      }
      return { success: true, data: result };
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [asyncFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate && asyncFn) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return {
    execute,
    data,
    loading,
    error,
    reset,
  };
};

export default useLoadingStates;
