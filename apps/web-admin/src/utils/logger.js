/**
 * Admin panel logger utility
 * Production-ready logging for containerized and serverless platforms
 *
 * Error tracking: Supports Sentry, LogRocket, and other error tracking services
 * Logs are captured via console.error/warn/info and visible in the platform dashboard
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Format error for structured logging (JSON format)
 */
function formatErrorForLogging(error, context = {}) {
  const timestamp = new Date().toISOString();
  const userAgent = typeof window !== 'undefined' ? window.navigator?.userAgent : 'unknown';
  const url = typeof window !== 'undefined' ? window.location?.href : 'unknown';
  
  return {
    timestamp,
    environment: isProduction ? 'production' : 'development',
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Error',
    },
    context: {
      ...context,
      userAgent,
      url,
    },
  };
}

  /**
   * Send error to tracking services
   * 
   * FIX 3: Added error suppression for known plugin errors to prevent logging loops
   */
  function sendToErrorTracking(error, context = {}) {
    if (typeof window === 'undefined') return;

    // FIX 3: Filter out known plugin errors (vite-plugin-terminal, etc.)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    const knownPluginErrors = [
      'Failed to fetch',
      'vite-plugin-terminal',
      '__x00__virtual:terminal',
    ];
    
    const isKnownPluginError = knownPluginErrors.some(pattern => 
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
    
    // Skip sending known plugin errors to tracking services
    if (isKnownPluginError) {
      return;
    }

    // Sentry integration
    if (window.Sentry?.captureException) {
      try {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        window.Sentry.captureException(errorObj, { contexts: { custom: context } });
      } catch (_e) {
        // Silently fail if error tracking fails
      }
    }

    // LogRocket integration
    if (window.LogRocket?.captureException) {
      try {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        window.LogRocket.captureException(errorObj);
      } catch (_e) {
        // Silently fail if error tracking fails
      }
    }
  }

class Logger {
  /**
   * Log an error (always logged, even in production)
   * Browser console errors are visible in browser DevTools; backend logs capture server-side errors
   */
  error(message, ...args) {
    const errorData = args[0] instanceof Error ? args[0] : new Error(message);
    const context = args.length > 1 ? args.slice(1) : {};
    
    // Structured logging using JSON format for easy parsing
    const structuredLog = formatErrorForLogging(errorData, {
      message,
      ...context,
    });
    
    // Always log errors (visible in browser console DevTools)
    // Use %c for styled console output to make errors more visible
    const errorStyle = 'color: red; font-weight: bold; font-size: 14px;';
    const contextStyle = 'color: #666; font-size: 12px;';
    
    console.error(
      `%c[ERROR] ${message}`,
      errorStyle,
      ...(isProduction 
        ? [`\n${JSON.stringify(structuredLog, null, 2)}`]
        : args
      )
    );
    
    // Also log structured data separately for better visibility
    if (isProduction && Object.keys(context).length > 0) {
      console.error('%cError Context:', contextStyle, structuredLog);
    }
    
    // Also log the error object for stack traces
    if (errorData instanceof Error) {
      console.error('%cStack Trace:', contextStyle, errorData.stack);
    }
    
    // Send to error tracking services
    try {
      sendToErrorTracking(errorData, structuredLog.context);
    } catch (_e) {
      // Fallback if error creation fails
      sendToErrorTracking(new Error(message), structuredLog.context);
    }
  }
  
  /**
   * Log a warning (always logged, visible in browser console)
   */
  warn(message, ...args) {
    const structuredLog = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      environment: isProduction ? 'production' : 'development',
      context: args.length > 0 ? args : {},
    };
    
    const warnStyle = 'color: orange; font-weight: bold; font-size: 13px;';
    const contextStyle = 'color: #666; font-size: 12px;';
    
    console.warn(
      `%c[WARN] ${message}`,
      warnStyle,
      ...(isProduction && args.length > 0
        ? [`\n${JSON.stringify(structuredLog, null, 2)}`]
        : args
      )
    );
    
    if (isProduction && Object.keys(structuredLog.context).length > 0) {
      console.warn('%cWarning Context:', contextStyle, structuredLog);
    }
  }
  
  /**
   * Log informational message (only in development, or if explicitly enabled)
   */
  info(message, ...args) {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    } else if (import.meta.env.VITE_ENABLE_INFO_LOGS === 'true') {
      // Allow enabling info logs in production via env var
      const structuredLog = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        context: args.length > 0 ? args : {},
      };
      console.info(`[INFO] ${message}`, JSON.stringify(structuredLog, null, 0));
    }
  }
  
  /**
   * Log debug message (only in development)
   * Automatically skipped in production builds
   */
  debug(message, ...args) {
    // Skip debug logs in production
    if (isProduction) {
      return;
    }
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
  
  /**
   * Log API error with full context (production-ready)
   */
  logApiError(error, requestConfig = {}) {
    const errorData = {
      message: error.message || 'API request failed',
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: requestConfig.url || error.config?.url,
      method: requestConfig.method || error.config?.method,
      baseURL: requestConfig.baseURL || error.config?.baseURL,
      response: error.response?.data ? {
        message: error.response.data.message,
        errors: error.response.data.errors,
      } : undefined,
    };
    
    this.error('API Error', error, errorData);
  }
  
  /**
   * Log with context (structured logging using JSON)
   */
  logWithContext(level, message, context = {}) {
    const structuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: isProduction ? 'production' : 'development',
      context,
    };
    
    const logMessage = `[${level.toUpperCase()}] ${message}`;
    const logData = JSON.stringify(structuredLog, null, isDevelopment ? 2 : 0);
    
    switch (level) {
      case 'error':
        if (isProduction) {
          console.error(logMessage, logData);
        } else {
          console.error(logMessage, context);
        }
        break;
      case 'warn':
        if (isProduction) {
          console.warn(logMessage, logData);
        } else {
          console.warn(logMessage, context);
        }
        break;
      case 'info':
        if (isDevelopment || import.meta.env.VITE_ENABLE_INFO_LOGS === 'true') {
          if (isProduction) {
            console.info(logMessage, logData);
          } else {
            console.info(logMessage, context);
          }
        }
        break;
      case 'debug':
        if (isDevelopment) {
          console.debug(logMessage, context);
        }
        break;
    }
  }
}

export const logger = new Logger();
export default logger;

