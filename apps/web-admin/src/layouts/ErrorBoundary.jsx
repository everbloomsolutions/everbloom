// src/layouts/ErrorBoundary.jsx
import { Component } from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Wrap logger call in try-catch to prevent logger errors from breaking the boundary
    try {
      logger.error('Error caught by boundary:', error, errorInfo);
    } catch (logError) {
      // Fallback to console if logger fails
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
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Oops! Something went wrong</h1>
                <p className="text-gray-600 mt-1">The application encountered an unexpected error.</p>
              </div>
            </div>

            {(import.meta.env.DEV || import.meta.env.MODE === 'development') && this.state.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Error Details:</h3>
                <p className="text-red-600 text-sm font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-gray-600 font-mono">
                    <summary className="cursor-pointer hover:text-gray-800">
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
                Go to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                If this problem persists, please contact support or check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;