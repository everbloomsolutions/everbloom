import axiosInstance from '../shared/axiosInstance';

/**
 * Audit Log API - Manages audit log queries
 */
export const auditApi = {
  /**
   * Get all audit logs with filtering
   */
  getAuditLogs: async (params = {}) => {
    const response = await axiosInstance.get('/admin/audit-logs', { params });
    return response.data;
  },

  /**
   * Get audit logs for a specific entity
   */
  getEntityAuditLogs: async (entityType, entityId, params = {}) => {
    const response = await axiosInstance.get(
      `/admin/audit-logs/entity/${entityType}/${entityId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get audit log statistics
   */
  getAuditLogStats: async (params = {}) => {
    const response = await axiosInstance.get('/admin/audit-logs/stats', { params });
    return response.data;
  },

  /**
   * Export audit logs as CSV
   */
  exportCSV: async (params = {}) => {
    const response = await axiosInstance.get('/admin/audit-logs/export/csv', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Export audit logs as JSON
   */
  exportJSON: async (params = {}) => {
    const response = await axiosInstance.get('/admin/audit-logs/export/json', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default auditApi;

