export const parseApiError = (error) => {
  if (error.response) {
    return {
      message: error.response.data?.message || 'An error occurred',
      status: error.response.status,
      errors: error.response.data?.errors || null,
    };
  }

  if (error.request) {
    return {
      message: 'No response from server',
      status: null,
      errors: null,
    };
  }

  return {
    message: error.message || 'Unknown error',
    status: null,
    errors: null,
  };
};

export const getErrorMessage = (error) => {
  const parsed = parseApiError(error);
  return parsed.message;
};

export const getValidationErrors = (error) => {
  const parsed = parseApiError(error);
  return parsed.errors || {};
};
