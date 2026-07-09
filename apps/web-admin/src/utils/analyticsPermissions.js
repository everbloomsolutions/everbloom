/**
 * Centralized Analytics Role Permissions (Frontend)
 * 
 * This file mirrors the backend permissions to ensure consistency.
 * In a production environment, consider fetching these from an API endpoint.
 */

/**
 * Role-based report type permissions
 * Maps each role to the report types they can generate
 */
export const ROLE_REPORT_PERMISSIONS = {
  'user': ['my-analytics'],
  'agent': ['my-analytics', 'location', 'user'],
  'admin': ['location', 'agent', 'collection', 'user', 'comprehensive'],
  'super_admin': ['location', 'agent', 'collection', 'user', 'comprehensive'],
};

/**
 * Valid report types
 */
export const VALID_REPORT_TYPES = [
  'my-analytics',
  'location',
  'agent',
  'collection',
  'user',
  'comprehensive',
];

/**
 * Get allowed report types for a role
 * @param {string} userRole - The user's role
 * @returns {string[]} Array of allowed report types
 */
export const getAllowedReportTypes = (userRole) => {
  return ROLE_REPORT_PERMISSIONS[userRole] || [];
};

/**
 * Check if a role has permission to generate a specific report type
 * @param {string} userRole - The user's role
 * @param {string} reportType - The report type to check
 * @returns {boolean} True if the role has permission
 */
export const hasReportPermission = (userRole, reportType) => {
  const allowedTypes = ROLE_REPORT_PERMISSIONS[userRole];
  if (!allowedTypes) {
    return false;
  }
  return allowedTypes.includes(reportType);
};

/**
 * Get role-friendly label
 * @param {string} userRole - The user's role
 * @returns {string} Friendly role label
 */
export const getRoleLabel = (userRole) => {
  const roleLabels = {
    'user': 'User',
    'agent': 'Agent',
    'admin': 'Administrator',
    'super_admin': 'Super Administrator',
  };
  return roleLabels[userRole] || userRole;
};

/**
 * Get report type friendly label
 * @param {string} reportType - The report type
 * @returns {string} Friendly report type label
 */
export const getReportTypeLabel = (reportType) => {
  const reportTypeLabels = {
    'my-analytics': 'My Analytics',
    'location': 'Location Analytics',
    'agent': 'Agent Analytics',
    'collection': 'Collection Analytics',
    'user': 'User Analytics',
    'comprehensive': 'Comprehensive Report',
  };
  return reportTypeLabels[reportType] || reportType;
};
