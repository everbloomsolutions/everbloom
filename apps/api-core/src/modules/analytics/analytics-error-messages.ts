/**
 * Role-specific error messages for analytics
 * Provides user-friendly error messages based on user role and context
 */

/**
 * Get a user-friendly error message for access denied scenarios
 * @param userRole - The user's role
 * @param reportType - The report type they tried to access
 * @param context - Additional context (e.g., 'generate', 'view')
 * @returns User-friendly error message
 */
export const getAccessDeniedMessage = (
  userRole: string,
  reportType: string,
  context: 'generate' | 'view' | 'export' = 'generate'
): string => {
  const roleLabels: Record<string, string> = {
    'user': 'User',
    'agent': 'Agent',
    'admin': 'Administrator',
    'super_admin': 'Super Administrator',
  };

  const reportTypeLabels: Record<string, string> = {
    'my-analytics': 'My Analytics',
    'location': 'Location Analytics',
    'agent': 'Agent Analytics',
    'collection': 'Collection Analytics',
    'user': 'User Analytics',
    'comprehensive': 'Comprehensive Report',
  };

  const roleLabel = roleLabels[userRole] || userRole;
  const reportLabel = reportTypeLabels[reportType] || reportType;

  const actionLabels: Record<string, string> = {
    'generate': 'generate',
    'view': 'view',
    'export': 'export',
  };

  const action = actionLabels[context] || 'access';

  // Provide role-specific guidance
  if (userRole === 'user') {
    return `As a ${roleLabel}, you can only ${action} your personal analytics reports. The ${reportLabel} report requires higher permissions. Please contact your administrator if you need access to this report.`;
  }

  if (userRole === 'agent') {
    return `As an ${roleLabel}, you don't have permission to ${action} ${reportLabel} reports. You can ${action} My Analytics, Location Analytics, and User Analytics reports. Please contact your administrator if you need access to this report.`;
  }

  // For admin/super_admin, this shouldn't normally happen, but provide a generic message
  return `You don't have permission to ${action} ${reportLabel} reports. Please contact your system administrator if you believe this is an error.`;
};

/**
 * Get a user-friendly error message for invalid report type
 * @param reportType - The invalid report type
 * @returns User-friendly error message
 */
export const getInvalidReportTypeMessage = (reportType: string): string => {
  return `The report type "${reportType}" is not valid. Please select a valid report type from the available options.`;
};

/**
 * Get a user-friendly error message for missing role
 * @returns User-friendly error message
 */
export const getMissingRoleMessage = (): string => {
  return 'Your user role could not be determined. Please refresh the page or contact support if the issue persists.';
};
