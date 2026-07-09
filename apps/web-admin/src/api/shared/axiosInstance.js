// src/api/axiosInstance.js
import axios from 'axios';
import { tokenManager } from '../../utils/tokenManager';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';
import { normalizeResponse } from '../../utils/apiResponse';

// Request cache and deduplication
const requestCache = new Map();
// Note: inFlightRequests was removed as it's not used
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from request config
 */
const getCacheKey = (config) => {
  const { method, url, params, data } = config;
  const paramsStr = params ? JSON.stringify(params) : '';
  const dataStr = data ? JSON.stringify(data) : '';
  return `${method?.toUpperCase()}:${url}:${paramsStr}:${dataStr}`;
};

/**
 * Check if cached data is still valid
 */
const _isCacheValid = (cached) => {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_TTL;
};

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, cached] of requestCache.entries()) {
    if (now - cached.timestamp >= CACHE_TTL) {
      requestCache.delete(key);
    }
  }
};

// Periodically clear expired cache
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 60 * 1000); // Every minute
}

// Create axios instance
// Use full URL to avoid proxy issues - Vite env vars should be loaded by dotenv-cli

// Environment detection (module-level for use throughout)
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

const getBaseURL = () => {
  // Check for runtime configuration (injected at container startup for Docker deployments only)
  // Vercel uses build-time env vars, so runtime config is only for Docker
  const isDocker = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__;
  const runtimeConfig = isDocker ? window.__RUNTIME_CONFIG__ : null;
  
  /**
   * Backend URL Configuration
   * 
   * Port Priority:
   * 1. VITE_BACKEND_URL (full URL, highest priority)
   * 2. VITE_BACKEND_HOST + VITE_BACKEND_PORT (constructed, development only)
   * 3. Default: http://localhost:8080 (development only)
   * 
   * Development: Vite proxy handles routing (uses relative URLs)
   * Production: VITE_API_BASE_URL must be set (full URL required for separate deployments)
   */
  const backendHost = import.meta.env.VITE_BACKEND_HOST || 'localhost';
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '8080';
  const backendUrl = import.meta.env.VITE_BACKEND_URL || (isProduction ? '' : `http://${backendHost}:${backendPort}`);
  
  // Check for VITE_API_URL (full URL) or VITE_API_BASE_URL
  // Priority: runtime config (Docker only) > build-time env vars
  // Normalize empty strings to undefined for consistent handling
  const rawApiUrl = (isDocker && runtimeConfig?.VITE_API_URL) || import.meta.env.VITE_API_URL;
  const rawApiBaseUrl = (isDocker && runtimeConfig?.VITE_API_BASE_URL) || import.meta.env.VITE_API_BASE_URL;
  const apiUrl = rawApiUrl && rawApiUrl.trim() ? rawApiUrl : undefined;
  const apiBaseUrl = rawApiBaseUrl && rawApiBaseUrl.trim() ? rawApiBaseUrl : undefined;
  
  // In development, use Vite proxy with relative URLs (recommended)
  // This allows Vite to handle CORS and routing automatically
  if (isDevelopment) {
    logger.debug('[getBaseURL] Development mode detected');
    logger.debug('[getBaseURL] apiUrl:', apiUrl);
    logger.debug('[getBaseURL] apiBaseUrl:', apiBaseUrl);
    logger.debug('[getBaseURL] backendUrl:', backendUrl);
    
    // Use relative URL to leverage Vite proxy (recommended approach)
    // If VITE_USE_PROXY is explicitly set to false, use full URL
    const useProxy = import.meta.env.VITE_USE_PROXY !== 'false';
    
    if (useProxy) {
      // Use relative URL - Vite proxy will handle routing to backend
      const result = '/api/v1';
      logger.debug('[getBaseURL] Using Vite proxy (relative URL):', result);
      return result;
    }
    
    // Fallback: Use full URL if proxy is disabled
    if (apiUrl && apiUrl.trim()) {
      // If VITE_API_URL is set, ensure it's a full URL and has /api/v1
      if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
        const result = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
        logger.debug('[getBaseURL] Using apiUrl (full):', result);
        return result;
      }
      // If it's relative, check if it's just "/api" (Vite proxy path) - ignore it
      // VITE_API_URL="/api" is set by vite.config.js for the proxy, not for axios
      if (apiUrl === '/api' || apiUrl === 'api' || apiUrl.trim() === '/api') {
        // Ignore this - it's the Vite proxy path, not the actual API URL
        logger.debug('[getBaseURL] Ignoring VITE_API_URL="/api" (Vite proxy path, not API URL)');
        // Fall through to use apiBaseUrl or fallback
      } else {
        // If it's a relative path with /api/v1 or similar, convert to full URL
        const path = apiUrl.startsWith('/') ? apiUrl : `/${apiUrl}`;
        // Only append /api/v1 if it doesn't already have it
        const fullPath = path.endsWith('/api/v1') ? path : 
                        (path.endsWith('/v1') ? path : 
                        (path.endsWith('/api') ? `${path}/v1` : `${path}/api/v1`));
        const result = `${backendUrl}${fullPath}`;
        logger.debug('[getBaseURL] Using apiUrl (converted):', result);
        return result;
      }
    }
    
    if (apiBaseUrl && apiBaseUrl.trim()) {
      // If it's already a full URL, use it
      if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
        logger.debug('[getBaseURL] Using apiBaseUrl (full):', apiBaseUrl);
        return apiBaseUrl;
      }
      // Convert relative path to full URL to bypass proxy
      const path = apiBaseUrl.startsWith('/') ? apiBaseUrl : `/${apiBaseUrl}`;
      const result = `${backendUrl}${path}`;
      logger.debug('[getBaseURL] Using apiBaseUrl (converted):', result);
      return result;
    }
    
    // Development fallback: use full URL with correct port (only if backendUrl is available)
    if (backendUrl) {
      const result = `${backendUrl}/api/v1`;
      logger.debug('[getBaseURL] Using fallback:', result);
      return result;
    }
    
    // Last resort: use relative URL (will use Vite proxy)
    logger.debug('[getBaseURL] Using relative URL (Vite proxy)');
    return '/api/v1';
  }
  
  // Production: MUST use full URL (admin panel and backend are on different services)
  // Relative URLs won't work when frontend and backend are deployed separately
  
  // Debug: Log all env vars for troubleshooting
  const backendUrlEnv = import.meta.env.VITE_BACKEND_URL;
  const allEnvVars = {
    VITE_API_URL: apiUrl || '(not set)',
    VITE_API_BASE_URL: apiBaseUrl || '(not set)',
    VITE_BACKEND_URL: backendUrlEnv || '(not set)',
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    runtimeConfig: runtimeConfig ? 'present' : 'not found',
  };
  
  // Log detected env vars (only in production for debugging)
  logger.debug('[getBaseURL] Production mode - Detected environment variables:', allEnvVars);
  
  // If we have runtime config, log it
  if (runtimeConfig) {
    logger.debug('[getBaseURL] Using runtime configuration from window.__RUNTIME_CONFIG__:', runtimeConfig);
  }
  
  if (apiUrl && apiUrl.trim()) {
    // Remove quotes if present (some platforms add them)
    const cleanApiUrl = apiUrl.replace(/^["']|["']$/g, '').trim();
    
    // If VITE_API_URL is set, ensure it's a full URL and has /api/v1
    if (cleanApiUrl.startsWith('http://') || cleanApiUrl.startsWith('https://')) {
      const result = cleanApiUrl.endsWith('/api/v1') ? cleanApiUrl : `${cleanApiUrl}/api/v1`;
      if (import.meta.env.DEV) {
        logger.debug('[getBaseURL] Using VITE_API_URL:', result);
      }
      return result;
    }
    // Relative URL in production - won't work when frontend and backend are separate
    logger.warn('[getBaseURL] VITE_API_URL is relative in production. Full URL required for separate deployments.', {
      apiUrl: cleanApiUrl,
      suggestion: 'VITE_API_URL should be a full URL like https://your-backend.example.com/api/v1',
    });
    return cleanApiUrl.endsWith('/api/v1') ? cleanApiUrl : `${cleanApiUrl}/api/v1`;
  }
  
  if (apiBaseUrl && apiBaseUrl.trim()) {
    // Remove quotes if present (some platforms add them)
    const cleanApiBaseUrl = apiBaseUrl.replace(/^["']|["']$/g, '').trim();
    
    // If it's a full URL, use it
    if (cleanApiBaseUrl.startsWith('http://') || cleanApiBaseUrl.startsWith('https://')) {
      logger.debug('[getBaseURL] Using VITE_API_BASE_URL:', cleanApiBaseUrl);
      return cleanApiBaseUrl;
    }
    // Relative URL in production - won't work when frontend and backend are separate
    logger.error('[getBaseURL] VITE_API_BASE_URL is relative in production!', {
      apiBaseUrl: cleanApiBaseUrl,
      rawValue: apiBaseUrl,
      suggestion: 'Set VITE_API_BASE_URL to full URL: https://your-backend.example.com/api/v1',
      note: 'Make sure there are NO quotes around the value',
    });
    return cleanApiBaseUrl;
  }
  
  // Production: Fail fast if no API URL is configured
  const errorMessage = 'VITE_API_BASE_URL or VITE_API_URL must be set in production. API requests will fail without a valid backend URL.';
  logger.error('[getBaseURL] No API URL configured in production!', {
    detectedEnvVars: allEnvVars,
    suggestion: 'Set VITE_API_BASE_URL environment variable (full URL required)',
    example: 'VITE_API_BASE_URL=https://your-backend.example.com/api/v1',
    note: 'Runtime config is supported for Docker deployments only. Vercel requires build-time env vars.',
    impact: 'API requests will fail',
  });
  
  // In production, throw error to fail fast (prevents silent failures)
  if (isProduction && !apiUrl && !apiBaseUrl) {
    throw new Error(errorMessage);
  }
  
  // Fallback (should not reach here in production)
  return '/api/v1';
};

// Get base URL and validate it
// Wrap in try-catch to prevent module loading errors from causing blank screen
let baseURL;
let axiosInstance;

try {
  baseURL = getBaseURL();

  // Runtime validation: In production, baseURL MUST be a full URL (not relative)
  if (isProduction && baseURL.startsWith('/')) {
    const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║  🚨 CONFIGURATION ERROR: API URL Not Set 🚨                   ║
╠════════════════════════════════════════════════════════════════╣
║  The admin panel is using a relative URL (${baseURL}) which   ║
║  won't work when frontend and backend are deployed separately.║
║  You MUST set VITE_API_BASE_URL to a full URL.                 ║
║                                                                ║
║  📋 HOW TO FIX:                                                ║
║  1. Set VITE_API_BASE_URL environment variable                ║
║  2. Use full URL: https://your-backend.example.com/api/v1     ║
║  3. Redeploy your application                                 ║
║                                                                ║
║  💡 See deployment documentation for platform-specific steps  ║
╚════════════════════════════════════════════════════════════════╝
    `;
    
    // Log error with full context (wrapped in try-catch to prevent errors)
    try {
      logger.error('CRITICAL: API Base URL not configured for production', {
        currentBaseURL: baseURL,
        detectedVariables: {
          VITE_API_URL: import.meta.env.VITE_API_URL,
          VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
          VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
        },
        issue: 'Using relative URL in production will cause 405 errors',
        solution: 'Set VITE_API_BASE_URL environment variable in Railway admin panel service',
        steps: [
          '1. Go to Railway Dashboard',
          '2. Select admin panel service (not backend)',
          '3. Go to Variables tab',
          '4. Add VITE_API_BASE_URL=https://your-backend.up.railway.app/api/v1',
          '5. Redeploy',
        ],
        impact: 'All API requests will fail with 405 errors',
      });
    } catch (_logError) {
      // Fallback: logger failed, but we already logged above
      // This catch block is just to prevent unhandled errors
    }
    
    // Show prominent error message (wrapped in try-catch)
    try {
      logger.error('API Configuration Error', new Error(errorMessage), {
        baseURL,
        message: 'API requests will fail until VITE_API_BASE_URL is configured in Railway',
      });
    } catch (_consoleError) {
      // Silently fail if logger throws
    }
  }

  axiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 30000, // Increased timeout to 30 seconds
    headers: {
      'Content-Type': 'application/json'
    },
    withCredentials: true
  });
} catch (initError) {
  // Fallback: Create axios instance with default baseURL to prevent blank screen
  logger.error('Failed to initialize axios instance', initError, {
    fallbackBaseURL: '/api/v1',
    message: 'API configuration error. App will load but API calls may fail.',
  });
  baseURL = '/api/v1'; // Fallback to relative URL
  axiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    },
    withCredentials: true
  });
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetry = (error, retryCount) => {
  // Don't retry if max retries reached
  if (retryCount >= MAX_RETRIES) return false;
  
  // Retry on network errors
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return true;
  
  // Retry on timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) return true;
  
  // Retry on 5xx server errors (except 501, 502, 503 which might be temporary)
  if (error.response?.status >= 500 && error.response?.status < 600) return true;
  
  // Retry on 429 (Too Many Requests)
  if (error.response?.status === 429) return true;
  
  return false;
};

const getRetryDelay = (retryCount) => {
  // Exponential backoff: 1s, 2s, 4s
  return RETRY_DELAY_BASE * Math.pow(2, retryCount);
};

// Log the base URL for debugging (only in development)
// Wrap in try-catch to prevent logging errors from breaking the app
try {
  const finalBaseURL = baseURL || getBaseURL();
  if (isDevelopment) {
    logger.debug('🔗 [AXIOS] API Base URL:', finalBaseURL);
    logger.debug('🔗 [AXIOS] VITE_API_URL:', import.meta.env.VITE_API_URL);
    logger.debug('🔗 [AXIOS] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    logger.debug('🔗 [AXIOS] VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    logger.debug('🔗 [AXIOS] MODE:', import.meta.env.MODE);
  } else {
    // Production: Log only if there's a configuration issue
    if (finalBaseURL.startsWith('/')) {
      logger.error('[AXIOS] Configuration Error: Using relative URL in production', {
        baseURL: finalBaseURL,
        issue: 'Relative URLs won\'t work on Railway (admin panel and backend are separate services)',
        solution: 'Set VITE_API_BASE_URL to full backend URL in Railway environment variables',
        example: 'VITE_API_BASE_URL=https://your-backend-service.up.railway.app/api/v1',
      });
    } else {
      // Log successful configuration (info level, can be enabled via env var)
      logger.info('[AXIOS] API Base URL configured', { baseURL: finalBaseURL });
    }
  }
} catch (_logError) {
  // Silently fail - don't let logging errors break the app
  // Error already logged by logger if it was able to
}

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Clear any existing redirect timeout from previous request
    if (config.__redirectTimeout) {
      clearTimeout(config.__redirectTimeout);
      delete config.__redirectTimeout;
    }
    
    // Production check: Warn if using relative URL (will fail on Railway)
    if (isProduction && config.baseURL && config.baseURL.startsWith('/')) {
      const fullUrl = `${config.baseURL}${config.url || ''}`;
      logger.error('API Request with relative URL (will fail on Railway)', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        fullUrl,
        issue: 'Relative URLs don\'t work when admin panel and backend are separate services',
        fix: 'Set VITE_API_BASE_URL environment variable in Railway',
      });
    }
    
    // Add auth token to requests
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add cache key to config for response interceptor (for GET requests only)
    if (config.method?.toLowerCase() === 'get' && !config.forceRefresh) {
      config.__cacheKey = getCacheKey(config);
    }

    // Initialize retry count if not set
    if (config.__retryCount === undefined) {
      config.__retryCount = 0;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Skip normalization for blob/arraybuffer responses (binary data)
    const isBlobResponse = response.config?.responseType === 'blob' || 
                          response.config?.responseType === 'arraybuffer' ||
                          response.data instanceof Blob;
    
    if (isBlobResponse) {
      // For blob responses, return as-is without normalization
      return response;
    }
    
    // Normalize response to consistent format for JSON responses
    const normalized = normalizeResponse(response);
    
    // Cache successful GET responses
    if (response.config?.__cacheKey && response.config.method?.toLowerCase() === 'get') {
      requestCache.set(response.config.__cacheKey, {
        data: normalized.data,
        timestamp: Date.now(),
      });
    }

    // Attach normalized response to original response object for easy access
    response.normalized = normalized;
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle blob error responses (error might be in blob format)
    if (error.response && 
        (originalRequest?.responseType === 'blob' || originalRequest?.responseType === 'arraybuffer') &&
        error.response.data instanceof Blob) {
      try {
        // Try to read error message from blob
        const text = await error.response.data.text();
        const errorData = JSON.parse(text);
        error.response.data = errorData;
        error.message = errorData.message || errorData.error || 'Request failed';
      } catch (_parseError) {
        // If parsing fails, use default error message
        error.message = 'Failed to generate report. Please try again.';
      }
    }

    // Skip token refresh for authentication endpoints (login, logout, register, refresh-token)
    const authEndpoints = ['/auth/login', '/auth/logout', '/auth/register', '/auth/refresh-token'];
    const isAuthEndpoint = originalRequest?.url && authEndpoints.some(endpoint => 
      originalRequest.url.includes(endpoint)
    );

    // If 401 and not already retried, and not an auth endpoint, try to refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        const baseURL = axiosInstance.defaults.baseURL || getBaseURL();
        
        if (!refreshToken) {
          // No refresh token available, clear auth and redirect
          logger.debug('No refresh token available for refresh');
          tokenManager.clearAll();
          // Don't redirect here - let the error propagate naturally
          return Promise.reject(error);
        }

        if (!baseURL) {
          logger.error('Base URL not configured');
          throw new Error('API base URL not configured');
        }

        const refreshUrl = `${baseURL}/auth/refresh`;
        logger.debug('Attempting token refresh...');
        
        const response = await axios.post(refreshUrl, { refreshToken }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Backend returns: { success: true, data: { token, refreshToken } }
        const token = response?.data?.data?.token || response?.data?.token;
        
        if (token && typeof token === 'string') {
          // Update access token, keep refresh token if provided
          const newRefreshToken = response?.data?.data?.refreshToken;
          if (newRefreshToken) {
            tokenManager.setTokens(token, newRefreshToken);
          } else {
            tokenManager.setToken(token);
          }

          logger.debug('Token refreshed successfully');

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        } else {
          throw new Error('Invalid token in refresh response');
        }
      } catch (refreshError) {
        // Refresh failed, clear auth but don't redirect immediately
        // Let the calling code handle the error
        logger.error('Token refresh failed:', refreshError);
        tokenManager.clearAll();
        
        // Only redirect if we're not already on login page
        if (!window.location.pathname.includes('/login')) {
          // Use setTimeout to avoid navigation during error handling
          // Store timeout ID in request config for potential cleanup
          const timeoutId = setTimeout(() => {
            window.location.href = '/login';
          }, 100);
          if (originalRequest) {
            originalRequest.__redirectTimeout = timeoutId;
          }
        }
        
        return Promise.reject(refreshError);
      }
    }

    // If still 401 and it's not an auth endpoint, clear tokens
    // But don't redirect for auth endpoints (let them handle their own errors)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Only clear if we have tokens (to avoid clearing on initial login failure)
      if (tokenManager.isAuthenticated()) {
        tokenManager.clearAll();
        if (!window.location.pathname.includes('/login')) {
          // Use setTimeout to avoid navigation during error handling
          // Store timeout ID in request config for potential cleanup
          const timeoutId = setTimeout(() => {
            window.location.href = '/login';
          }, 100);
          if (originalRequest) {
            originalRequest.__redirectTimeout = timeoutId;
          }
        }
      }
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const retryCount = originalRequest?.__retryCount || 0;
      if (shouldRetry(error, retryCount)) {
        originalRequest.__retryCount = retryCount + 1;
        const delay = getRetryDelay(retryCount);
        logger.warn(`Request timeout, retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);
        await sleep(delay);
        return axiosInstance(originalRequest);
      }
      const userMessage = 'Request timed out. Please check your connection and try again.';
      logger.error('Request timeout:', error);
      toast.error(userMessage);
      error.message = userMessage;
      return Promise.reject(error);
    }

    // Handle network errors (server not running, CORS, etc.)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const retryCount = originalRequest?.__retryCount || 0;
      if (shouldRetry(error, retryCount)) {
        originalRequest.__retryCount = retryCount + 1;
        const delay = getRetryDelay(retryCount);
        logger.warn(`Network error, retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);
        await sleep(delay);
        return axiosInstance(originalRequest);
      }
      const baseURL = axiosInstance.defaults.baseURL || getBaseURL() || 'backend server';
      const userMessage = `Cannot connect to backend server. Please ensure the backend is running.`;
      
      // Log API error with full context for Railway
      logger.logApiError(error, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        baseURL,
        errorType: 'network',
      });
      
      toast.error(userMessage);
      error.message = userMessage;
      return Promise.reject(error);
    }

    // Handle 5xx server errors with retry
    if (error.response?.status >= 500 && error.response?.status < 600) {
      const retryCount = originalRequest?.__retryCount || 0;
      if (shouldRetry(error, retryCount)) {
        originalRequest.__retryCount = retryCount + 1;
        const delay = getRetryDelay(retryCount);
        logger.warn(`Server error ${error.response.status}, retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);
        await sleep(delay);
        return axiosInstance(originalRequest);
      }
      const userMessage = 'Server error. Please try again later.';
      
      // Log API error with full context for Railway
      logger.logApiError(error, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        baseURL: axiosInstance.defaults.baseURL,
        errorType: 'server',
        status: error.response.status,
      });
      
      toast.error(userMessage);
      error.message = userMessage;
      return Promise.reject(error);
    }

    // Handle 429 Too Many Requests with retry
    if (error.response?.status === 429) {
      const retryCount = originalRequest?.__retryCount || 0;
      if (shouldRetry(error, retryCount)) {
        originalRequest.__retryCount = retryCount + 1;
        const delay = getRetryDelay(retryCount);
        logger.warn(`Rate limited, retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);
        await sleep(delay);
        return axiosInstance(originalRequest);
      }
      const userMessage = 'Too many requests. Please wait a moment and try again.';
      
      // Log API error for Railway
      logger.logApiError(error, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        errorType: 'rate_limit',
        status: 429,
      });
      
      toast.error(userMessage);
      error.message = userMessage;
      return Promise.reject(error);
    }

    // Handle 405 Method Not Allowed (common on Railway if API URL misconfigured)
    if (error.response?.status === 405) {
      const baseURL = axiosInstance.defaults.baseURL || getBaseURL();
      const isRelativeURL = baseURL.startsWith('/');
      
      let userMessage = 'Request method not allowed.';
      let detailedMessage = 'The API endpoint does not accept this HTTP method.';
      
      // If using relative URL in production, this is a configuration issue
      if (isProduction && isRelativeURL) {
        userMessage = 'API Configuration Error: Backend URL not configured.';
        detailedMessage = `The admin panel is trying to use a relative URL (${baseURL}), but on Railway, the admin panel and backend are separate services. You must set VITE_API_BASE_URL environment variable in Railway to your backend service URL.`;
        
        // Log detailed error with instructions
        logger.error('API Configuration Error - Backend URL not configured', new Error(userMessage), {
          baseURL,
          isRelativeURL,
          detailedMessage,
          instructions: {
            step1: 'Go to Railway Dashboard → Your Admin Panel Service → Variables',
            step2: 'Add/Edit variable:',
            variableName: 'VITE_API_BASE_URL',
            variableValue: 'https://your-backend.example.com/api/v1',
            important: 'Do NOT add quotes around the value!',
            step3: 'Redeploy the admin panel service (Vite needs env vars at BUILD time)',
          },
          detectedEnvVars: {
            VITE_API_URL: import.meta.env.VITE_API_URL,
            VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
            VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
          },
          fullRequestURL: `${baseURL}${originalRequest?.url || ''}`,
        });
      }
      
      logger.logApiError(error, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        baseURL: baseURL,
        errorType: 'method_not_allowed',
        status: 405,
        isRelativeURL,
        suggestion: isRelativeURL 
          ? 'Set VITE_API_BASE_URL to full backend URL in Railway'
          : 'Check if the backend route accepts this HTTP method',
      });
      
      toast.error(userMessage);
      if (isProduction && isRelativeURL) {
        // Show detailed error in a second toast
        setTimeout(() => {
          toast.error(detailedMessage, { duration: 10000 });
        }, 2000);
      }
      
      error.message = userMessage;
      return Promise.reject(error);
    }

    // Handle other API errors (4xx, etc.)
    if (error.response) {
      logger.logApiError(error, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        baseURL: axiosInstance.defaults.baseURL,
        errorType: 'api_error',
        status: error.response.status,
      });
    } else {
      // Unknown error
      logger.error('Unknown API error:', error, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        baseURL: axiosInstance.defaults.baseURL,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;