import axiosInstance from '../shared/axiosInstance';

/**
 * Inquiry API - Manages contact form submissions from the frontend contact page
 * 
 * Data Flow:
 * 1. Frontend contact page → POST /api/v1/contact → saves to Contact model
 * 2. Admin panel → GET /api/v1/admin/contacts → retrieves from same Contact model
 * 
 * Both endpoints use the same database, so admin panel views contacts submitted from frontend
 */
export const inquiryApi = {
  getAllInquiries: async (params = {}) => {
    // Fetches contact form submissions from frontend contact page
    const response = await axiosInstance.get('/admin/contacts', { params });
    return response.data;
  },

  getInquiryById: async (id) => {
    const response = await axiosInstance.get(`/admin/contacts/${id}`);
    return response.data;
  },

  createInquiry: async (inquiryData) => {
    // Contact form submission uses public endpoint
    const response = await axiosInstance.post('/contact', inquiryData);
    return response.data;
  },

  updateInquiry: async (id, inquiryData) => {
    const response = await axiosInstance.put(`/admin/contacts/${id}`, inquiryData);
    return response.data;
  },

  deleteInquiry: async (id) => {
    const response = await axiosInstance.delete(`/admin/contacts/${id}`);
    return response.data;
  },

  getMyInquiries: async (params = {}) => {
    // This endpoint may not exist - using admin contacts for now
    const response = await axiosInstance.get('/admin/contacts', { params });
    return response.data;
  },

  /**
   * Get inquiry/contact statistics
   */
  getInquiryStats: async () => {
    const response = await axiosInstance.get('/admin/contacts/stats');
    return response.data;
  },
};

export default inquiryApi;
