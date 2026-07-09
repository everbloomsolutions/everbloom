// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from 'react';
import { authApi } from '../api';
import { tokenManager } from '../utils/tokenManager';
import logger from '../utils/logger';
import socketService from '../services/socketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const token = tokenManager.getToken();
        if (token) {
          const res = await authApi.getProfile();
          const data = res.data?.data || res.data;
          if (data?.user) {
            setUser(data.user);
            setIsAuthenticated(true);
            socketService.connect(token);
          } else {
            tokenManager.clearAll();
            socketService.disconnect();
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          socketService.disconnect();
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        logger.error('initAuth error:', err?.response?.data || err.message || err);
        tokenManager.clearAll();
        socketService.disconnect();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // authApi.login returns { success, user, accessToken, refreshToken, message } directly
      const response = await authApi.login({ email, password });

      // Debug logging
      logger.debug('Full response:', response);

      if (!response || typeof response !== 'object') {
        logger.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }

      const { accessToken, user: loggedUser } = response;

      if (!accessToken) {
        const msg = response.message || 'No token received from server';
        logger.error('Login response missing token:', response);
        throw new Error(msg);
      }

      // Tokens are already set by authApi.login, but we set user state here
      if (loggedUser) {
        setUser(loggedUser);
      } else {
        setUser(null);
      }

      setIsAuthenticated(true);
      socketService.connect(accessToken);
      return response;
    } catch (error) {
      let serverMessage = error?.response?.data?.message || error.message || 'Login failed';
      
      // Handle network errors specifically
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Cannot connect to backend')) {
        serverMessage = 'Cannot connect to backend server. Please ensure the backend server is running.';
      }
      
      logger.error('Login error:', error?.response?.data || error.message || error);
      throw new Error(serverMessage);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // ignore network errors on logout
      logger.error('Logout error', err);
    } finally {
      tokenManager.clearAll?.();
      socketService.disconnect();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      return response;
    } catch (error) {
      logger.error('Registration error:', error?.response?.data || error.message || error);
      const errorMessage = error?.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    if (updatedUser) tokenManager.setUser?.(updatedUser);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};