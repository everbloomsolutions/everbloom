import axiosInstance from '../shared/axiosInstance';

export const userApi = {
  getAllUsers: async (params = {}) => {
    const response = await axiosInstance.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await axiosInstance.get(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await axiosInstance.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await axiosInstance.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await axiosInstance.delete(`/admin/users/${id}`);
    return response.data;
  },

  toggleUserStatus: async (id, isActive) => {
    const response = await axiosInstance.patch(`/admin/users/${id}/status`, { isActive });
    return response.data;
  },

  archiveDuplicateUsers: async (params = {}) => {
    const response = await axiosInstance.post('/admin/users/archive-duplicates', {
      mode: params.mode,
      limitGroups: params.limitGroups,
    });
    return response.data;
  },

  /**
   * Get user statistics
   */
  getUserStats: async () => {
    const response = await axiosInstance.get('/admin/users/stats');
    return response.data;
  },

  /**
   * Set user's default location (for role 'user')
   */
  setUserDefaultLocation: async (userId, locationId) => {
    const response = await axiosInstance.put(`/admin/users/${userId}/default-location`, { locationId });
    return response.data;
  },

  /**
   * Remove user's default location
   */
  removeUserDefaultLocation: async (userId) => {
    const response = await axiosInstance.delete(`/admin/users/${userId}/default-location`);
    return response.data;
  },

  /**
   * Set agent's assigned locations (for role 'agent')
   */
  setAgentLocations: async (userId, locationIds) => {
    const response = await axiosInstance.put(`/admin/users/${userId}/assigned-locations`, { locationIds });
    return response.data;
  },

  /**
   * Get my collection analytics (for user/agent role)
   */
  getMyCollectionAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/my-analytics', { params });
    return response.data;
  },
};

export default userApi;
