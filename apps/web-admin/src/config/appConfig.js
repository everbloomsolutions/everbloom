/**
 * Application Configuration
 * 
 * Configuration Priority:
 * - Development: Uses Vite proxy (relative URLs) for API calls
 * - Production: Uses VITE_API_BASE_URL (full URL required for separate deployments)
 * - Runtime config: Supports runtime injection via window.__RUNTIME_CONFIG__ (for Docker deployments)
 */
export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'Admin Panel',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  // API Base URL: runtime config (Docker only) > build-time env vars > fail in production
  apiBaseUrl: (() => {
    const isDocker = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__;
    const runtimeConfig = isDocker ? window.__RUNTIME_CONFIG__ : null;
    
    // Runtime config (Docker deployments only)
    if (runtimeConfig?.VITE_API_BASE_URL) {
      return runtimeConfig.VITE_API_BASE_URL;
    }
    
    // Build-time config (Vercel, Railway, etc.)
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    
    // Production: fail fast if not set
    if (import.meta.env.MODE === 'production') {
      console.error('VITE_API_BASE_URL must be set in production');
      return ''; // Return empty to trigger errors
    }
    
    // Development: use relative URL (Vite proxy)
    return '/api/v1';
  })(),
  // Socket URL: runtime config (Docker only) > build-time env vars > derive from API URL > fallback
  socketUrl: (() => {
    const isDocker = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__;
    const runtimeConfig = isDocker ? window.__RUNTIME_CONFIG__ : null;
    
    // Runtime config (Docker deployments only)
    if (runtimeConfig?.VITE_SOCKET_URL) {
      return runtimeConfig.VITE_SOCKET_URL;
    }
    
    // Build-time config (Vercel, Railway, etc.)
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    
    // Derive from API URL if available (remove /api/v1 suffix)
    const apiBaseUrl = (runtimeConfig?.VITE_API_BASE_URL) || import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl && !apiBaseUrl.startsWith('/')) {
      // Extract base URL from API URL (remove /api/v1)
      const baseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, '');
      return baseUrl;
    }
    
    // Fallback: only use localhost in development
    return import.meta.env.MODE === 'production' 
      ? (typeof window !== 'undefined' ? window.location.origin : '')
      : 'http://localhost:8080';
  })(),
  environment: import.meta.env.MODE || 'development',
};

export default appConfig;
