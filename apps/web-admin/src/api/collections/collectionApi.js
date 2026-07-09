import axiosInstance from '../shared/axiosInstance';

/**
 * Collection API - Manages recycling collections
 * 
 * This API provides comprehensive CRUD operations and management features for
 * recycling collections (service requests). Collections represent the actual
 * recycling service requests submitted by users.
 * 
 * Used by: Collections page (src/pages/Collections.jsx)
 * Backend endpoint: /admin/collections
 * 
 * Relationship with projectApi:
 * - collectionApi: Basic CRUD operations, receipts, transfers, import/export
 * - projectApi: Workflow operations (quotes, starting projects, progress updates)
 * 
 * Both APIs interact with the same backend endpoint (/admin/collections) but
 * provide different sets of operations. Use collectionApi for general collection
 * management and projectApi for project workflow operations.
 */
export const collectionApi = {
  getAllCollections: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections', { params });
    return response.data;
  },

  getCollectionById: async (id) => {
    const response = await axiosInstance.get(`/admin/collections/${id}`);
    return response.data;
  },

  createCollection: async (collectionData) => {
    const response = await axiosInstance.post('/admin/collections', collectionData);
    return response.data;
  },

  updateCollection: async (id, collectionData) => {
    const response = await axiosInstance.put(`/admin/collections/${id}`, collectionData);
    return response.data;
  },

  deleteCollection: async (id) => {
    const response = await axiosInstance.delete(`/admin/collections/${id}`);
    return response.data;
  },

  transferCollection: async (id, newAgentId) => {
    const response = await axiosInstance.put(`/admin/collections/${id}/transfer`, {
      newAgentId,
    });
    return response.data;
  },

  generateReceipt: async (collectionId, upiTransactionId) => {
    const response = await axiosInstance.post(`/admin/collections/${collectionId}/receipt`, {
      upiTransactionId,
    });
    return response.data;
  },

  getReceipt: async (receiptId) => {
    const response = await axiosInstance.get(`/receipts/${receiptId}`);
    return response.data;
  },

  getReceiptByCollectionId: async (collectionId) => {
    const response = await axiosInstance.get(`/receipts/collection/${collectionId}`);
    return response.data;
  },

  /**
   * Download receipt as PDF by receipt ID
   */
  downloadReceiptPDF: async (receiptId) => {
    const response = await axiosInstance.get(`/receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Print receipt as PDF by collection ID
   */
  printReceiptPDF: async (collectionId) => {
    const response = await axiosInstance.get(`/receipts/collection/${collectionId}/print`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Export collections to CSV or Excel
   * @param {Object} params - Export parameters
   * @param {string} params.format - 'csv' or 'xlsx' (default: 'csv')
   */
  exportCollections: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/export', {
      params: {
        ...params,
        format: params.format || 'csv',
      },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Validate collections import without committing
   * @param {File|string} fileData - File object or CSV string
   * @returns {Promise<Object>} Validation result with preview
   */
  validateCollectionsImport: async (fileData) => {
    const formData = new FormData();
    
    if (fileData instanceof File) {
      formData.append('file', fileData);
      const response = await axiosInstance.post('/admin/collections/import/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // String input (backward compatibility)
      const response = await axiosInstance.post('/admin/collections/import/validate', { csvData: fileData });
      return response.data;
    }
  },

  /**
   * Import collections from CSV or Excel
   * 
   * @param {File|string} fileData - File object or CSV string
   * @param {Object} options - Import options
   * @param {boolean} options.async - Process in background (default: false)
   * 
   * @returns {Promise<Object>} Import result or job info
   */
  importCollections: async (fileData, options = {}) => {
    const { async = false } = options;
    const formData = new FormData();
    
    if (fileData instanceof File) {
      formData.append('file', fileData);
      const response = await axiosInstance.post('/admin/collections/import', formData, {
        params: { async },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // String input (backward compatibility)
      const response = await axiosInstance.post('/admin/collections/import', { 
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
    const response = await axiosInstance.get('/admin/collections/import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get job status
   * @param {string} jobId - Job ID
   */
  getJobStatus: async (jobId) => {
    const response = await axiosInstance.get(`/admin/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Cancel job
   * @param {string} jobId - Job ID
   */
  cancelJob: async (jobId) => {
    const response = await axiosInstance.delete(`/admin/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Get collection statistics (accurate totals)
   */
  getCollectionStatistics: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections/statistics', { params });
    return response.data;
  },

  archiveDuplicateCollections: async (params = {}) => {
    const response = await axiosInstance.post('/admin/collections/archive-duplicates', {
      mode: params.mode,
      limitGroups: params.limitGroups,
    });
    return response.data;
  },
};

export default collectionApi;

