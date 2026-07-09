import axiosInstance from '../shared/axiosInstance';

/**
 * Location API - Manages registered locations
 */
export const locationApi = {
  /**
   * Get paginated list of locations with filters
   */
  getLocations: async (params = {}) => {
    const response = await axiosInstance.get('/admin/locations', { params });
    return response.data;
  },

  /**
   * Get location by ID
   */
  getLocationById: async (id) => {
    const response = await axiosInstance.get(`/admin/locations/${id}`);
    return response.data;
  },

  /**
   * Get location with statistics
   */
  getLocationWithStats: async (id) => {
    const response = await axiosInstance.get(`/admin/locations/${id}/stats`);
    return response.data;
  },

  /**
   * Create new location
   */
  createLocation: async (locationData) => {
    const response = await axiosInstance.post('/admin/locations', locationData);
    return response.data;
  },

  /**
   * Update location
   */
  updateLocation: async (id, locationData) => {
    const response = await axiosInstance.put(`/admin/locations/${id}`, locationData);
    return response.data;
  },

  /**
   * Delete location (soft delete)
   */
  deleteLocation: async (id) => {
    const response = await axiosInstance.delete(`/admin/locations/${id}`);
    return response.data;
  },

  /**
   * Search locations for autocomplete
   */
  searchLocations: async (query, limit = 10) => {
    const response = await axiosInstance.get('/admin/locations/search', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Get location statistics
   */
  getLocationStats: async () => {
    const response = await axiosInstance.get('/admin/locations/stats');
    return response.data;
  },

  /**
   * Get location analytics
   */
  getLocationAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/locations/analytics', { params });
    return response.data;
  },

  /**
   * Bulk create locations
   */
  bulkCreateLocations: async (locations) => {
    const response = await axiosInstance.post('/admin/locations/bulk', { locations });
    return response.data;
  },

  /**
   * Bulk update locations
   */
  bulkUpdateLocations: async (updates) => {
    const response = await axiosInstance.put('/admin/locations/bulk', { updates });
    return response.data;
  },

  /**
   * Bulk delete locations
   * Uses POST method (standard for bulk operations with body)
   */
  bulkDeleteLocations: async (ids) => {
    const response = await axiosInstance.post('/admin/locations/bulk/delete', { ids });
    return response.data;
  },

  /**
   * Export locations to CSV or Excel
   * @param {Object} params - Export parameters
   * @param {string} params.format - 'csv' or 'xlsx' (default: 'csv')
   */
  exportLocations: async (params = {}) => {
    const response = await axiosInstance.get('/admin/locations/export', {
      params: {
        ...params,
        format: params.format || 'csv',
      },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Validate locations import without committing
   * @param {File|string} fileData - File object or CSV string
   */
  validateLocationsImport: async (fileData) => {
    const formData = new FormData();
    
    if (fileData instanceof File) {
      formData.append('file', fileData);
      const response = await axiosInstance.post('/admin/locations/import/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      const response = await axiosInstance.post('/admin/locations/import/validate', { csvData: fileData });
      return response.data;
    }
  },

  /**
   * Import locations from CSV or Excel
   * @param {File|string} fileData - File object or CSV string
   * @param {Object} options - Import options
   * @param {boolean} options.async - Process in background (default: false)
   */
  importLocations: async (fileData, options = {}) => {
    const { async = false } = options;
    const formData = new FormData();
    
    if (fileData instanceof File) {
      formData.append('file', fileData);
      const response = await axiosInstance.post('/admin/locations/import', formData, {
        params: { async },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      const response = await axiosInstance.post('/admin/locations/import', { 
        csvData: fileData,
        async,
      });
      return response.data;
    }
  },

  /**
   * Get import template
   */
  getImportTemplate: async () => {
    const response = await axiosInstance.get('/admin/locations/import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Check for duplicate locations
   */
  checkDuplicates: async (locationData) => {
    const response = await axiosInstance.post('/admin/locations/check-duplicates', locationData);
    return response.data;
  },

  /**
   * Suggest merge for two locations
   */
  suggestMerge: async (id1, id2) => {
    const response = await axiosInstance.get(`/admin/locations/${id1}/merge/${id2}`);
    return response.data;
  },

  /**
   * Merge two locations
   */
  mergeLocations: async (sourceId, targetId) => {
    const response = await axiosInstance.post('/admin/locations/merge', { sourceId, targetId });
    return response.data;
  },
};

export default locationApi;

