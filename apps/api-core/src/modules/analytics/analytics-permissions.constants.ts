/**
 * Centralized Analytics Role Permissions
 * 
 * This file contains the single source of truth for role-based report type permissions.
 * All other files should import from here to ensure consistency.
 */

import { ReportType } from './analytics-report.types';

/**
 * Role-based report type permissions
 * Maps each role to the report types they can generate
 */
export const ROLE_REPORT_PERMISSIONS: Record<string, ReportType[]> = {
  'user': ['my-analytics'],
  'agent': ['my-analytics', 'location', 'user'],
  'admin': ['location', 'agent', 'collection', 'user', 'comprehensive'],
  'super_admin': ['location', 'agent', 'collection', 'user', 'comprehensive'],
};

/**
 * Valid report types
 */
export const VALID_REPORT_TYPES: ReportType[] = [
  'my-analytics',
  'location',
  'agent',
  'collection',
  'user',
  'comprehensive',
];

/**
 * Get allowed report types for a role
 * @param userRole - The user's role
 * @returns Array of allowed report types
 */
export const getAllowedReportTypes = (userRole: string): ReportType[] => {
  return ROLE_REPORT_PERMISSIONS[userRole] || [];
};

/**
 * Check if a role has permission to generate a specific report type
 * @param userRole - The user's role
 * @param reportType - The report type to check
 * @returns True if the role has permission
 */
export const hasReportPermission = (userRole: string, reportType: ReportType): boolean => {
  const allowedTypes = ROLE_REPORT_PERMISSIONS[userRole];
  if (!allowedTypes) {
    return false;
  }
  return allowedTypes.includes(reportType);
};
