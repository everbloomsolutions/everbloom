import { Component } from 'react';
import logger from '../../utils/logger';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Can be used at any level for granular error handling
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    try {
      logger.error('Error caught by boundary:', error, errorInfo);
    } catch (logError) {
      // Only log to console in development
      if (import.meta.env.DEV) {
        console.error('Error caught by boundary:', error, errorInfo);
        if (logError) {
          console.error('Logger also failed:', logError);
        }
      }
    }
    this.setState({
      error,
      errorInfo,
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call optional onReset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {this.props.title || 'Oops! Something went wrong'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {this.props.message || 'The application encountered an unexpected error.'}
                </p>
              </div>
            </div>

            {(import.meta.env.DEV || import.meta.env.MODE === 'development') && this.state.error && (
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Error Details:</h3>
                <p className="text-red-600 dark:text-red-400 text-sm font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                {this.props.resetText || 'Try Again'}
              </button>
              {this.props.showReload && (
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Reload Page
                </button>
              )}
            </div>

            {this.props.children && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {this.props.children}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
