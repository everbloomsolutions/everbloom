/**
 * Role-specific error messages for analytics (Frontend)
 * Provides user-friendly error messages based on user role and context
 */

import { getRoleLabel, getReportTypeLabel, getAllowedReportTypes } from './analyticsPermissions';

/**
 * Get a user-friendly error message for access denied scenarios
 * @param {string} userRole - The user's role
 * @param {string} reportType - The report type they tried to access
 * @param {string} context - Additional context (e.g., 'generate', 'view', 'export')
 * @returns {string} User-friendly error message
 */
export const getAccessDeniedMessage = (userRole, reportType, context = 'generate') => {
  const roleLabel = getRoleLabel(userRole);
  const reportLabel = getReportTypeLabel(reportType);

  const actionLabels = {
    'generate': 'generate',
    'view': 'view',
    'export': 'export',
  };

  const action = actionLabels[context] || 'access';

  // Provide role-specific guidance
  if (userRole === 'user') {
    const _allowedTypes = getAllowedReportTypes(userRole);
    return `As a ${roleLabel}, you can only ${action} your personal analytics reports. The ${reportLabel} report requires higher permissions. Please contact your administrator if you need access to this report.`;
  }

  if (userRole === 'agent') {
    const allowedTypes = getAllowedReportTypes(userRole);
    const allowedLabels = allowedTypes.map(getReportTypeLabel).join(', ');
    return `As an ${roleLabel}, you don't have permission to ${action} ${reportLabel} reports. You can ${action} the following reports: ${allowedLabels}. Please contact your administrator if you need access to this report.`;
  }

  // For admin/super_admin, this shouldn't normally happen, but provide a generic message
  return `You don't have permission to ${action} ${reportLabel} reports. Please contact your system administrator if you believe this is an error.`;
};

/**
 * Get a user-friendly error message for invalid report type
 * @param {string} reportType - The invalid report type
 * @returns {string} User-friendly error message
 */
export const getInvalidReportTypeMessage = (reportType) => {
  return `The report type "${reportType}" is not valid. Please select a valid report type from the available options.`;
};

/**
 * Get a user-friendly error message for missing role
 * @returns {string} User-friendly error message
 */
export const getMissingRoleMessage = () => {
  return 'Your user role could not be determined. Please refresh the page or contact support if the issue persists.';
};

/**
 * Get a user-friendly error message for 403 Forbidden errors
 * @param {string} userRole - The user's role
 * @param {string} errorMessage - The original error message from the API
 * @returns {string} User-friendly error message
 */
export const getForbiddenErrorMessage = (userRole, errorMessage) => {
  // Try to extract report type from error message
  const reportTypeMatch = errorMessage.match(/generate\s+(\w+[-]?\w*)\s+reports/i);
  if (reportTypeMatch) {
    const reportType = reportTypeMatch[1];
    return getAccessDeniedMessage(userRole, reportType, 'generate');
  }

  // Fallback to generic message
  return `Access denied. You don't have permission to perform this action. ${userRole ? `As a ${getRoleLabel(userRole)}, you may have limited access to certain features.` : ''} Please contact your administrator if you need access.`;
};
