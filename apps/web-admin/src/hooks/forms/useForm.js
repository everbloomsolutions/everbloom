import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for form state management
 * Provides consistent form handling with validation and error management
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Function} validate - Validation function (optional)
 * @param {Function} onSubmit - Submit handler
 * @returns {Object} Form state and handlers
 */
export const useForm = (initialValues = {}, validate = null, onSubmit = null) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  /**
   * Update a single field value
   */
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Update multiple field values
   */
  const setValuesMultiple = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setValue(name, fieldValue);
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, [setValue]);

  /**
   * Handle blur event (mark field as touched)
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
    
    // Validate single field if validator provided
    if (validate) {
      const fieldErrors = validate({ [name]: values[name] });
      if (fieldErrors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: fieldErrors[name],
        }));
      }
    }
  }, [values, validate]);

  /**
   * Set error for a specific field
   */
  const setError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  /**
   * Set multiple errors
   */
  const setErrorsMultiple = useCallback((newErrors) => {
    setErrors(prev => ({
      ...prev,
      ...newErrors,
    }));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearError = useCallback((name) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  /**
   * Validate form
   */
  const validateForm = useCallback(() => {
    if (!validate) return true;
    
    const validationErrors = validate(values);
    setErrors(validationErrors);
    
    return Object.keys(validationErrors).length === 0;
  }, [values, validate]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    
    // Validate form
    if (!validateForm()) {
      return false;
    }

    if (!onSubmit) return true;

    setIsSubmitting(true);
    try {
      const result = await onSubmit(values);
      return result;
    } catch (error) {
      // Handle API validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          const fieldName = err.path?.join('.') || err.field || 'unknown';
          fieldErrors[fieldName] = err.message;
        });
        setErrorsMultiple(fieldErrors);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit, setErrorsMultiple]);

  /**
   * Reset form to initial values
   */
  const reset = useCallback((newInitialValues = null) => {
    const resetValues = newInitialValues || initialValues;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Reset specific fields
   */
  const resetFields = useCallback((fieldNames) => {
    const resetValues = { ...values };
    const resetTouched = { ...touched };
    const resetErrors = { ...errors };
    
    fieldNames.forEach(name => {
      resetValues[name] = initialValues[name];
      delete resetTouched[name];
      delete resetErrors[name];
    });
    
    setValues(resetValues);
    setTouched(resetTouched);
    setErrors(resetErrors);
  }, [values, touched, errors, initialValues]);

  /**
   * Get field props for easy integration with form inputs
   */
  const getFieldProps = useCallback((name, options = {}) => {
    return {
      name,
      value: values[name] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: touched[name] ? errors[name] : undefined,
      ...options,
    };
  }, [values, handleChange, handleBlur, touched, errors]);

  return {
    // Values
    values,
    setValue,
    setValues: setValuesMultiple,
    
    // Errors
    errors,
    setError,
    setErrors: setErrorsMultiple,
    clearErrors,
    clearError,
    
    // Touched
    touched,
    
    // State
    isSubmitting,
    
    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    
    // Utilities
    reset,
    resetFields,
    getFieldProps,
    
    // Form ref
    formRef,
  };
};

export default useForm;
