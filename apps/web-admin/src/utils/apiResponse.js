/**
 * API Response Wrapper Utility
 * Normalizes API responses to a consistent format
 */

/**
 * Normalizes API response to consistent format
 * Handles both { success, data, message } and direct data responses
 * 
 * @param {Object} response - Axios response object
 * @returns {Object} Normalized response with { success, data, message }
 */
export const normalizeResponse = (response) => {
  if (!response || !response.data) {
    return {
      success: false,
      data: null,
      message: 'Invalid response format',
    };
  }

  const { data } = response;

  // If response already has success field, assume it's standardized
  if (typeof data.success === 'boolean') {
    return {
      success: data.success,
      data: data.data !== undefined ? data.data : data,
      message: data.message || (data.success ? 'Success' : 'Error'),
    };
  }

  // If response has data field, extract it
  if (data.data !== undefined) {
    return {
      success: true,
      data: data.data,
      message: data.message || 'Success',
    };
  }

  // Otherwise, treat entire response as data
  return {
    success: true,
    data: data,
    message: data.message || 'Success',
  };
};

/**
 * Extracts data from normalized response
 * 
 * @param {Object} normalizedResponse - Normalized response from normalizeResponse
 * @returns {*} The data field from the response
 */
export const extractData = (normalizedResponse) => {
  return normalizedResponse?.data;
};

/**
 * Checks if response indicates success
 * 
 * @param {Object} normalizedResponse - Normalized response from normalizeResponse
 * @returns {boolean} True if response indicates success
 */
export const isSuccess = (normalizedResponse) => {
  return normalizedResponse?.success === true;
};

/**
 * Gets error message from response
 * 
 * @param {Object} normalizedResponse - Normalized response from normalizeResponse
 * @returns {string} Error message or default message
 */
export const getErrorMessage = (normalizedResponse) => {
  return normalizedResponse?.message || 'An error occurred';
};

