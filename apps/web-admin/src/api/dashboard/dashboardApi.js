import axiosInstance from '../shared/axiosInstance';

export const dashboardApi = {
  getDashboardStats: async () => {
    const response = await axiosInstance.get('/admin/dashboard');
    return response.data;
  },

  /**
   * Get analytics data
   */
  getAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/analytics', { params });
    return response.data;
  },

  getTodayActivityOverview: async () => {
    const response = await axiosInstance.get('/admin/dashboard/today');
    return response.data;
  },

  getTodayPerformanceMetrics: async () => {
    const response = await axiosInstance.get('/admin/dashboard/today/performance');
    return response.data;
  },

  getRecentDataAndGrowth: async () => {
    const response = await axiosInstance.get('/admin/dashboard/recent');
    return response.data;
  },
};

export default dashboardApi;
