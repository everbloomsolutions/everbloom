/**
 * Report validation utilities
 * 
 * Note: Role permissions are now centralized in analyticsPermissions.js
 * This file imports from there to maintain consistency.
 */

import { 
  VALID_REPORT_TYPES, 
  ROLE_REPORT_PERMISSIONS,
  getAllowedReportTypes,
  hasReportPermission 
} from './analyticsPermissions';
import { getAccessDeniedMessage } from './analyticsErrorMessages';

/**
 * Validate report type
 * @param {string} reportType - The report type to validate
 * @param {string} userRole - The user's role
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateReportType = (reportType, userRole) => {
  if (!reportType) {
    return { valid: false, error: 'Report type is required' };
  }

  if (!VALID_REPORT_TYPES.includes(reportType)) {
    return { valid: false, error: `Invalid report type: ${reportType}` };
  }

  if (!userRole) {
    return { valid: false, error: 'User role is required' };
  }

  const allowedTypes = ROLE_REPORT_PERMISSIONS[userRole];
  if (!allowedTypes) {
    return { valid: false, error: `Invalid user role: ${userRole}` };
  }

  if (!hasReportPermission(userRole, reportType)) {
    return { 
      valid: false, 
      error: getAccessDeniedMessage(userRole, reportType, 'generate')
    };
  }

  return { valid: true };
};

/**
 * Validate date range
 * @param {string} startDate - Start date (ISO string or empty)
 * @param {string} endDate - End date (ISO string or empty)
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateDateRange = (startDate, endDate) => {
  // If both dates are empty, that's valid (means all data)
  if (!startDate && !endDate) {
    return { valid: true };
  }

  // If only one date is provided, that's invalid
  if ((startDate && !endDate) || (!startDate && endDate)) {
    return { valid: false, error: 'Both start date and end date must be provided, or leave both empty' };
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    // Check if end date is before start date
    if (end < start) {
      return { valid: false, error: 'End date must be after or equal to start date' };
    }

    // Check if dates are in the future
    if (start > today || end > today) {
      return { valid: false, error: 'Dates cannot be in the future' };
    }

    // Check if date range is too large (more than 10 years)
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    const maxDays = 3650; // 10 years
    if (daysDiff > maxDays) {
      return { valid: false, error: `Date range cannot exceed ${maxDays / 365} years` };
    }

    // Check if date range is too small (less than 1 day)
    if (daysDiff < 0) {
      return { valid: false, error: 'Date range must be at least 1 day' };
    }

    return { valid: true };
  } catch (_error) {
    return { valid: false, error: 'Error validating date range' };
  }
};

// Re-export for backward compatibility
export { getAllowedReportTypes };
