import axiosInstance from '../shared/axiosInstance';

/**
 * Archived API - Manages deleted items (Collections, Locations, Users)
 */
export const archivedApi = {
  // Collections
  getDeletedCollections: async (params = {}) => {
    const response = await axiosInstance.get('/admin/archived/collections', { params });
    return response.data;
  },

  restoreCollection: async (id) => {
    const response = await axiosInstance.post(`/admin/archived/collections/${id}/restore`);
    return response.data;
  },

  permanentlyDeleteCollection: async (id) => {
    const response = await axiosInstance.delete(`/admin/archived/collections/${id}`);
    return response.data;
  },

  // Locations
  getDeletedLocations: async (params = {}) => {
    const response = await axiosInstance.get('/admin/archived/locations', { params });
    return response.data;
  },

  restoreLocation: async (id) => {
    const response = await axiosInstance.post(`/admin/archived/locations/${id}/restore`);
    return response.data;
  },

  permanentlyDeleteLocation: async (id) => {
    const response = await axiosInstance.delete(`/admin/archived/locations/${id}`);
    return response.data;
  },

  // Users
  getDeletedUsers: async (params = {}) => {
    const response = await axiosInstance.get('/admin/archived/users', { params });
    return response.data;
  },

  restoreUser: async (id) => {
    const response = await axiosInstance.post(`/admin/archived/users/${id}/restore`);
    return response.data;
  },

  permanentlyDeleteUser: async (id) => {
    const response = await axiosInstance.delete(`/admin/archived/users/${id}`);
    return response.data;
  },
};

export default archivedApi;

