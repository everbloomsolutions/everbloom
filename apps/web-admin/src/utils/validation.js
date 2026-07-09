// src/utils/validation.js

/**
 * Centralized validation utilities
 * Provides reusable validators for form validation
 */

export const validators = {
  /**
   * Required field validator
   */
  required: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  /**
   * Email format validator
   */
  email: (value) => {
    if (!value) return null; // Let required handle empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Invalid email format';
    }
    return null;
  },

  /**
   * Minimum length validator
   */
  minLength: (value, min, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  /**
   * Maximum length validator
   */
  maxLength: (value, max, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} must be at most ${max} characters`;
    }
    return null;
  },

  /**
   * Password validator
   */
  password: (value, minLength = 6) => {
    if (!value) return null;
    if (value.length < minLength) {
      return `Password must be at least ${minLength} characters`;
    }
    return null;
  },

  /**
   * URL validator
   */
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },

  /**
   * Number validator
   */
  number: (value, fieldName = 'Field') => {
    if (!value) return null;
    if (isNaN(value) || isNaN(parseFloat(value))) {
      return `${fieldName} must be a valid number`;
    }
    return null;
  },

  /**
   * Positive number validator
   */
  positiveNumber: (value, fieldName = 'Field') => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },

  /**
   * Phone number validator (basic)
   */
  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
      return 'Invalid phone number format';
    }
    return null;
  },
};

/**
 * Validate form data against a schema
 * @param {Object} data - Form data object
 * @param {Object} schema - Validation schema { field: [validators] }
 * @returns {Object} - Errors object { field: errorMessage }
 */
export const validateForm = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    if (!Array.isArray(rules)) {
      return;
    }

    for (const rule of rules) {
      let validator, params;

      if (typeof rule === 'function') {
        validator = rule;
        params = [];
      } else if (Array.isArray(rule)) {
        [validator, ...params] = rule;
      } else {
        continue;
      }

      const error = validator(data[field], ...params, field);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return errors;
};

/**
 * Common validation schemas
 */
export const schemas = {
  email: [
    [validators.required, 'Email'],
    validators.email,
  ],

  password: [
    [validators.required, 'Password'],
    validators.password,
  ],

  name: [
    [validators.required, 'Name'],
    [validators.minLength, 2, 'Name'],
  ],

  phone: [
    [validators.required, 'Phone'],
    validators.phone,
  ],
};

/**
 * Backward-compatible boolean-returning validators
 * These return true/false instead of error messages/null
 * @deprecated Use validators object instead for better error messages
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== '';
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

export const validateMinLength = (value, minLength) => {
  return value && value.length >= minLength;
};

export const validateMaxLength = (value, maxLength) => {
  return value && value.length <= maxLength;
};

export const validateRange = (value, min, max) => {
  const num = parseFloat(value);
  return num >= min && num <= max;
};

export default {
  validators,
  validateForm,
  schemas,
  // Backward compatibility exports
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateUrl,
  validateNumber,
  validateMinLength,
  validateMaxLength,
  validateRange,
};
