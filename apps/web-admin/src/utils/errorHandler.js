import toast from 'react-hot-toast';
import logger from './logger';

/**
 * Standardized error handling utility
 * Logs errors and displays user-friendly messages
 * 
 * @param {Error} error - The error object
 * @param {Object} options - Error handling options
 * @param {string} options.context - Additional context for logging
 * @param {boolean} options.showToast - Whether to show toast notification (default: true)
 * @param {string} options.defaultMessage - Default message if error message is not available
 * @returns {Object} Error response object
 */
export const handleApiError = (error, options = {}) => {
  const { context = '', showToast = true, defaultMessage = 'An error occurred' } = options;
  
  let message = defaultMessage;
  let statusCode = 500;
  let errorType = 'unknown';

  if (error?.response) {
    // Server responded with error status
    message = error.response.data?.message || error.response.data?.error || defaultMessage;
    statusCode = error.response.status;
    errorType = 'server';

    // Log server errors with context
    logger.error(`API Error [${statusCode}]: ${message}`, {
      context,
      statusCode,
      url: error.config?.url,
      method: error.config?.method,
      error: error.response.data,
    });

    if (showToast) {
      switch (statusCode) {
        case 400:
          toast.error(message);
          break;
        case 401:
          toast.error('Unauthorized. Please login again.');
          break;
        case 403:
          toast.error('Access forbidden');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(message);
      }
    }
  } else if (error?.request) {
    // Request made but no response received
    message = 'Network error. Please check your connection.';
    errorType = 'network';
    
    logger.error('Network Error', {
      context,
      error: error.message,
      url: error.config?.url,
    });

    if (showToast) {
      toast.error(message);
    }
  } else {
    // Error setting up request or other error
    message = error?.message || defaultMessage;
    errorType = 'client';
    
    logger.error(`Client Error: ${message}`, {
      context,
      error: error instanceof Error ? error : new Error(message),
    });

    if (showToast) {
      toast.error(message);
    }
  }

  return {
    success: false,
    message,
    statusCode,
    errorType,
  };
};

/**
 * Log error with context (for non-API errors)
 * @param {Error} error - The error object
 * @param {string} context - Additional context for logging
 */
export const logError = (error, context = '') => {
  logger.error(`Error ${context}:`, error);
};
