import axiosInstance from '../shared/axiosInstance';

/**
 * Assignment API - Manages user/agent location assignments and location rates
 */
export const assignApi = {
  /**
   * Get all users with their default locations
   */
  getUsersWithLocations: async (params = {}) => {
    const response = await axiosInstance.get('/admin/assign/users', { params });
    return response.data;
  },

  /**
   * Assign default location to user
   */
  assignUserLocation: async (userId, locationId) => {
    const response = await axiosInstance.put(`/admin/assign/users/${userId}/location`, { locationId });
    return response.data;
  },

  /**
   * Remove default location from user
   */
  removeUserLocation: async (userId) => {
    const response = await axiosInstance.delete(`/admin/assign/users/${userId}/location`);
    return response.data;
  },

  /**
   * Get all agents with their assigned locations
   */
  getAgentsWithLocations: async (params = {}) => {
    const response = await axiosInstance.get('/admin/assign/agents', { params });
    return response.data;
  },

  /**
   * Assign locations to agent
   */
  assignAgentLocations: async (agentId, locationIds) => {
    const response = await axiosInstance.put(`/admin/assign/agents/${agentId}/locations`, { locationIds });
    return response.data;
  },

  /**
   * Get rates for a specific location
   */
  getLocationRates: async (locationId) => {
    const response = await axiosInstance.get(`/admin/assign/location-rates/${locationId}`);
    return response.data;
  },

  /**
   * Set rates for a location
   */
  setLocationRates: async (locationId, rates) => {
    const response = await axiosInstance.put(`/admin/assign/location-rates/${locationId}`, { rates });
    return response.data;
  },

  /**
   * Get rates for all locations (with pagination/filtering)
   */
  getAllLocationRates: async (params = {}) => {
    const response = await axiosInstance.get('/admin/assign/location-rates', { params });
    return response.data;
  },

  /**
   * Transfer location to another agent
   */
  transferLocation: async (locationId, newAgentId) => {
    const response = await axiosInstance.put(`/admin/assign/locations/${locationId}/transfer`, { newAgentId });
    return response.data;
  },
};
