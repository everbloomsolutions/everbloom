import logger from './logger';

// src/utils/tokenManager.js
// Tokens are stored in httpOnly cookies; this manager only tracks the
// non-sensitive user profile and a token-expiry timestamp for UX warnings.

const USER_KEY = 'user';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Error parsing stored value:', error);
    return null;
  }
};

export const tokenManager = {
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
  getUser: () => safeParse(localStorage.getItem(USER_KEY)),

  /**
   * Store the access token expiry timestamp (milliseconds)
   * @param {number} expiryMs
   */
  setTokenExpiry: (expiryMs) => {
    if (expiryMs) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryMs));
    }
  },

  /**
   * Get the stored token expiry timestamp
   * @returns {number|null}
   */
  getTokenExpiry: () => {
    const value = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!value) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  },

  /**
   * Check if the stored token is likely expired
   * @returns {boolean}
   */
  isTokenExpired: () => {
    const expiry = tokenManager.getTokenExpiry();
    if (!expiry) return true;
    return Date.now() >= expiry;
  },

  /**
   * Clear all authentication state (logout)
   */
  clearAuth: () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  /**
   * Clear all authentication state (alias for compatibility)
   */
  clearAll: () => {
    tokenManager.clearAuth();
  },

  /**
   * Check if user is authenticated based on stored profile
   * @returns {boolean} True if user is stored and token is not known to be expired
   */
  isAuthenticated: () => {
    return !!tokenManager.getUser() && !tokenManager.isTokenExpired();
  },

  // Deprecated: tokens are in httpOnly cookies. Kept for call-site compatibility.
  getToken: () => null,
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setToken: () => undefined,
  setTokens: () => undefined,
};

// Export individual functions for compatibility
export const getToken = tokenManager.getToken;
export const setToken = tokenManager.setToken;
export const getRefreshToken = tokenManager.getRefreshToken;
export const clearAll = tokenManager.clearAll;

export default tokenManager;