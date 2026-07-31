// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { tokenManager } from '../utils/tokenManager';
import logger from '../utils/logger';
import socketService from '../services/socketService';
import { useSessionTimeout } from '../hooks';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const res = await authApi.getProfile();
        const data = res.data?.data || res.data;
        if (data?.user) {
          setUser(data.user);
          tokenManager.setUser(data.user);
          setIsAuthenticated(true);
          socketService.connect();
        } else {
          tokenManager.clearAll();
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

  // Guard against the browser back button / bfcache returning to authenticated
  // pages after logout. If the token is gone, force the user back to login.
  useEffect(() => {
    const handlePopState = () => {
      if (!tokenManager.isAuthenticated()) {
        window.location.replace('/login');
      }
    };

    const handlePageShow = (event) => {
      if (event.persisted && !tokenManager.isAuthenticated()) {
        window.location.replace('/login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const login = async (email, password) => {
    try {
      // authApi.login returns { success, user, tokenExpiry, message }
      const response = await authApi.login({ email, password });

      if (!response || typeof response !== 'object') {
        logger.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }

      const { user: loggedUser } = response;

      if (!loggedUser) {
        const msg = response.message || 'Login failed';
        logger.error('Login response missing user:', response);
        throw new Error(msg);
      }

      setUser(loggedUser);
      setIsAuthenticated(true);
      socketService.connect();
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
      // Replace the current history entry so the browser Back button does not
      // return to the authenticated page the user was on.
      navigate('/login', { replace: true });
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

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getProfile();
      const data = res.data?.data || res.data;
      if (data?.user) {
        setUser(data.user);
        tokenManager.setUser?.(data.user);
      }
    } catch (err) {
      logger.error('refreshUser error:', err?.response?.data || err.message || err);
    }
  }, []);

  // Automatically log the user out when the access token is about to expire.
  useSessionTimeout(logout, isAuthenticated);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateUser,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};