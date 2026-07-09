/**
 * Response adapter for TanStack Query
 * Transforms API responses from { success, data, message } format
 * to the format expected by components
 * 
 * @param {Object} response - API response object
 * @returns {*} Transformed response data
 * @throws {Error} If response indicates failure
 */
export const adaptResponse = (response) => {
  // Handle error responses
  if (response?.success === false) {
    const error = new Error(response.message || 'Request failed');
    error.response = response;
    throw error;
  }
  
  // Extract data from response
  // Handle both formats:
  // 1. { success: true, data: {...} }
  // 2. Direct data object
  return response?.data !== undefined ? response.data : response;
};

/**
 * Create a query function that adapts the response
 * 
 * @param {Function} apiFunction - API function that returns a promise
 * @returns {Function} Query function compatible with TanStack Query
 */
export const createQueryFn = (apiFunction) => {
  return async () => {
    const response = await apiFunction();
    return adaptResponse(response);
  };
};
