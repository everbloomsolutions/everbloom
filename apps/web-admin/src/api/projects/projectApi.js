import axiosInstance from '../shared/axiosInstance';

/**
 * Project API - Manages service requests/projects workflow operations
 * 
 * This API provides workflow-specific operations for recycling service requests
 * (projects/collections). It focuses on the project lifecycle: quotes, starting,
 * progress tracking, and completion.
 * 
 * Used by: Projects page (src/pages/Projects.jsx)
 * Backend endpoint: /admin/collections (same as collectionApi)
 * 
 * Data Flow:
 * 1. Frontend → POST /api/v1/projects → creates project
 * 2. Admin panel → GET /api/v1/admin/collections → retrieves all projects/collections
 * 3. Admin panel → POST /api/v1/admin/collections/:id/quote → sends quote
 * 4. Admin panel → POST /api/v1/admin/collections/:id/start → starts project
 * 5. Admin panel → PATCH /api/v1/admin/collections/:id/progress → updates progress
 * 6. Admin panel → POST /api/v1/admin/collections/:id/complete → completes project
 * 
 * Relationship with collectionApi:
 * - projectApi: Workflow operations (quotes, starting, progress, completion)
 * - collectionApi: Basic CRUD, receipts, transfers, import/export, statistics
 * 
 * Note: Backend uses "collections" terminology for recycling service requests.
 * Both APIs interact with the same backend endpoint but provide different
 * operation sets. Use projectApi for project workflow management and
 * collectionApi for general collection management.
 */
export const projectApi = {
  getAllProjects: async (params = {}) => {
    const response = await axiosInstance.get('/admin/collections', { params });
    return response.data;
  },

  getProjectById: async (id) => {
    const response = await axiosInstance.get(`/admin/collections/${id}`);
    return response.data;
  },

  sendQuote: async (id, quoteData) => {
    const response = await axiosInstance.post(`/admin/collections/${id}/quote`, quoteData);
    return response.data;
  },

  startProject: async (id, assignedTo) => {
    const response = await axiosInstance.post(`/admin/collections/${id}/start`, { assignedTo });
    return response.data;
  },

  updateProgress: async (id, progressData) => {
    const response = await axiosInstance.patch(`/admin/collections/${id}/progress`, progressData);
    return response.data;
  },

  completeProject: async (id) => {
    const response = await axiosInstance.post(`/admin/collections/${id}/complete`);
    return response.data;
  },

  getProjectStats: async () => {
    const response = await axiosInstance.get('/admin/collections/stats');
    return response.data;
  },
};

export default projectApi;

