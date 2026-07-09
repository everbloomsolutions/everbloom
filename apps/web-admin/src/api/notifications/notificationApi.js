import axiosInstance from '../shared/axiosInstance';

export const notificationApi = {
  getAllNotifications: async (params = {}) => {
    const response = await axiosInstance.get('/notifications', { params });
    return response.data;
  },

  getNotificationById: async (id) => {
    const response = await axiosInstance.get(`/notifications/${id}`);
    return response.data;
  },

  createNotification: async (notificationData) => {
    const response = await axiosInstance.post('/notifications', notificationData);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await axiosInstance.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await axiosInstance.patch('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAllNotifications: async () => {
    const response = await axiosInstance.delete('/notifications');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await axiosInstance.get('/notifications/unread-count');
    return response.data;
  },
};

export default notificationApi;
