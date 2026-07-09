import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import logger from './utils/logger';

// Global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  const errorInfo = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
  };
  
  // Log with structured format
  logger.error('Global JavaScript error caught', event.error || new Error(event.message), errorInfo);
  
  // Don't prevent default - let React ErrorBoundary handle it
});

/**
 * FIX 2: Improved Unhandled Rejection Handler
 * 
 * Filters out known plugin errors (like vite-plugin-terminal) to prevent logging loops.
 * Only logs actual application errors, not plugin infrastructure errors.
 */
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonMessage = reason instanceof Error ? reason.message : String(reason);
  const reasonStack = reason instanceof Error ? reason.stack : undefined;
  
  // FIX 2: Filter out known plugin errors that don't affect application functionality
  const knownPluginErrors = [
    'Failed to fetch',
    'vite-plugin-terminal',
    '__x00__virtual:terminal',
    'ECONNREFUSED',
  ];
  
  const isKnownPluginError = knownPluginErrors.some(pattern => 
    reasonMessage.includes(pattern) || 
    (reasonStack && reasonStack.includes(pattern))
  );
  
  // Skip logging known plugin errors (they're infrastructure issues, not app errors)
  if (isKnownPluginError) {
    // Silently prevent default to avoid console spam
    event.preventDefault();
    return;
  }
  
  // Log actual application errors with structured format
  const rejectionInfo = {
    reason: event.reason,
    promise: event.promise,
    reasonMessage,
    reasonStack,
  };
  
  logger.error('Unhandled promise rejection', 
    reason instanceof Error ? reason : new Error(reasonMessage), 
    rejectionInfo
  );
  
  // Prevent default to avoid console spam, but log it
  event.preventDefault();
});

// Wrap React initialization in try-catch to prevent blank screen
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  // Fallback UI if React fails to initialize
  const initError = error instanceof Error ? error : new Error(String(error));
  logger.error('Failed to initialize React app', initError, {
    errorType: 'ReactInitializationError',
    errorMessage: initError.message,
    errorStack: initError.stack,
  });
  
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
      ">
        <div style="
          background: white;
          border-radius: 8px;
          padding: 40px;
          max-width: 600px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <h1 style="color: #dc2626; margin-top: 0;">Application Error</h1>
          <p style="color: #6b7280; line-height: 1.6;">
            The application failed to load. Please check the browser console for details.
          </p>
          <p style="color: #6b7280; line-height: 1.6; margin-top: 16px;">
            <strong>Error:</strong> ${error.message || 'Unknown error'}
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              margin-top: 24px;
              padding: 12px 24px;
              background: #2563eb;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            "
          >
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
