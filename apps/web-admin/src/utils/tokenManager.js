import logger from './logger';

// src/utils/tokenManager.js

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const tokenManager = {
  /**
   * Store access and refresh tokens
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token
   */
  setTokens: (accessToken, refreshToken) => {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  /**
   * Store single token (alias for setTokens for compatibility)
   * @param {string} token - JWT access token
   */
  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  /**
   * Get access token from storage (alias for getAccessToken)
   * @returns {string|null} Access token or null
   */
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Get access token from storage
   * @returns {string|null} Access token or null
   */
  getAccessToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Get refresh token from storage
   * @returns {string|null} Refresh token or null
   */
  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Store user data
   * @param {object} user - User object
   */
  setUser: (user) => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Get user data from storage
   * @returns {object|null} User object or null
   */
  getUser: () => {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      logger.error('Error parsing user data:', error);
      return null;
    }
  },

  /**
   * Clear all authentication data (logout)
   */
  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Clear all authentication data (alias for compatibility)
   */
  clearAll: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if access token exists
   */
  isAuthenticated: () => {
    return !!tokenManager.getAccessToken();
  },

  /**
   * Check if token is expired (basic check)
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired: (token) => {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch (error) {
      logger.error('Error checking token expiry:', error);
      return true;
    }
  },

  /**
   * Get token expiry time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiry date or null
   */
  getTokenExpiry: (token) => {
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      logger.error('Error getting token expiry:', error);
      return null;
    }
  }
};

// Export individual functions for convenience
export const getToken = tokenManager.getToken;
export const setToken = tokenManager.setToken;
export const getRefreshToken = tokenManager.getRefreshToken;
export const clearAll = tokenManager.clearAll;

export default tokenManager;