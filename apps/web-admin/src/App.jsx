// src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { QueryProvider } from './providers/QueryProvider';
import AppRoutes from './router/AppRoutes';
import ErrorBoundary from './layouts/ErrorBoundary';
import Toast from './components/shared/Toast';
import './utils/chartConfig'; // Register Chart.js globally
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <QueryProvider>
          <ThemeProvider>
            <UIProvider>
              <AuthProvider>
                {/* Skip to main content link for accessibility */}
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Skip to main content
                </a>
                <AppRoutes />
                <Toast />
              </AuthProvider>
            </UIProvider>
          </ThemeProvider>
        </QueryProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;