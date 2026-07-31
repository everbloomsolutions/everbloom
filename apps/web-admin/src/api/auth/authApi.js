// src/api/authApi.js
import axiosInstance from '../shared/axiosInstance';
import tokenManager from '../../utils/tokenManager';
import logger from '../../utils/logger';

export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await axiosInstance.post('/auth/login', credentials);

    // Backend response structure:
    // { success: true, data: { user, token, accessToken, refreshToken }, message: "Login successful" }
    // Backend provides both 'token' and 'accessToken' for compatibility

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }

    const { user, tokenExpiry } = response.data.data;

    if (!user) {
      logger.error('Login response missing user:', response.data);
      throw new Error('Login failed');
    }

    // Store user and session expiry; tokens are in httpOnly cookies
    tokenManager.setUser(user);
    if (tokenExpiry) tokenManager.setTokenExpiry(tokenExpiry);

    // Return consistent flattened structure
    return {
      success: true,
      user,
      tokenExpiry,
      message: response.data.message || 'Login successful'
    };
  },

  // Register
  register: async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      const response = await axiosInstance.post('/auth/logout');
      return response.data;
    } finally {
      // Always clear local storage on logout
      tokenManager.clearAuth();
    }
  },

  // Get current user profile
  getProfile: async () => {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await axiosInstance.put('/auth/update-profile', data);
    
    // Update stored user data if successful
    if (response.data.success && response.data.data) {
      tokenManager.setUser(response.data.data);
    }
    
    return response.data;
  },

  // Change password
  changePassword: async (passwords) => {
    const response = await axiosInstance.put('/auth/change-password', passwords);
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await axiosInstance.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    const response = await axiosInstance.post('/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await axiosInstance.post('/auth/verify-email', { token });
    return response.data;
  },

  // Refresh token
  refreshToken: async () => {
    // Cookies are sent automatically by axios (withCredentials). The refresh
    // token is read from the httpOnly cookie by the backend.
    const response = await axiosInstance.post('/auth/refresh', {});

    if (response.data.success && response.data.data) {
      const { tokenExpiry } = response.data.data;
      if (tokenExpiry) tokenManager.setTokenExpiry(tokenExpiry);

      return {
        success: true,
        tokenExpiry,
      };
    }

    return response.data;
  },

  // Get current user from storage
  getCurrentUser: () => {
    return tokenManager.getUser();
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return tokenManager.isAuthenticated();
  }
};