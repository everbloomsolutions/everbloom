/**
 * Report error handling utilities
 */

import { getForbiddenErrorMessage } from './analyticsErrorMessages';

/**
 * Parse blob error response
 * @param {Error} error - The error object
 * @returns {Promise<string>} Parsed error message
 */
export const parseBlobError = async (error) => {
  // Handle blob error responses
  if (error?.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const errorData = JSON.parse(text);
      return errorData.message || errorData.error || `Server error: ${error.response.status}`;
    } catch (_parseError) {
      return `Server error: ${error.response.status} ${error.response.statusText || ''}`;
    }
  }

  // Handle JSON error responses
  if (error?.response?.data) {
    if (typeof error.response.data === 'object') {
      return error.response.data.message || error.response.data.error || 'Server error occurred';
    }
    if (typeof error.response.data === 'string') {
      return error.response.data;
    }
  }

  // Handle network errors
  if (error?.message) {
    return error.message;
  }

  // Default error message
  return 'Failed to generate report. Please try again.';
};

/**
 * Handle report generation error with role-specific messages
 * @param {Error} error - The error object
 * @param {Function} showToast - Toast notification function (optional)
 * @param {string} defaultMessage - Default error message
 * @param {string} userRole - The user's role (optional, for role-specific messages)
 * @returns {Promise<string>} Error message string
 */
export const handleReportError = async (error, showToast, defaultMessage = 'Failed to generate report. Please try again.', userRole = null) => {
  let errorMessage = await parseBlobError(error);
  
  // Check if it's a 403 Forbidden error and we have user role
  if (error?.response?.status === 403 && userRole) {
    errorMessage = getForbiddenErrorMessage(userRole, errorMessage);
  }
  
  const finalMessage = errorMessage || defaultMessage;
  
  if (showToast) {
    showToast(finalMessage, 'error', 5000, 'Report Generation Failed');
  }
  
  return finalMessage;
};
