import axiosInstance from '../shared/axiosInstance';

export const analyticsApi = {
  /**
   * Get general analytics
   */
  getAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/analytics', { params });
    return response.data;
  },

  /**
   * Get analytics summary (uses /admin/analytics endpoint)
   */
  getAnalyticsSummary: async (params = {}) => {
    const response = await axiosInstance.get('/admin/analytics', { params });
    return response.data;
  },

  getCollectionAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/analytics', { params });
    return response.data;
  },

  getFinancialAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/financial-analytics', { params });
    return response.data;
  },

  getTimeSeriesAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/time-series-analytics', { params });
    return response.data;
  },

  getAgentPerformanceAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/agent-performance', { params });
    return response.data;
  },

  /**
   * Generate analytics report
   */
  generateReport: async (request) => {
    const response = await axiosInstance.post('/admin/analytics/reports/generate', request, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get report suggestions
   */
  getReportSuggestions: async (params = {}) => {
    const response = await axiosInstance.get('/admin/analytics/reports/suggestions', { params });
    return response.data;
  },

  /**
   * Quick export report
   */
  exportReport: async (reportType, format, params = {}) => {
    const response = await axiosInstance.get(`/admin/analytics/reports/${reportType}/export/${format}`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

export default analyticsApi;
