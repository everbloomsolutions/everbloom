import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { handleApiError } from '../utils/errorHandler';

/**
 * Create QueryClient with default options matching current behavior
 */
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes (matches current TTL)
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        refetchOnWindowFocus: false, // Match current behavior
        refetchOnMount: false, // Match current refetchOnMount: false
        retry: 1,
        retryDelay: 1000,
        // Global error handling
        onError: (error) => {
          handleApiError(error, { context: 'Query', showToast: true });
        },
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        onError: (error) => {
          handleApiError(error, { context: 'Mutation', showToast: true });
        },
      },
    },
  });
};

// Create a single QueryClient instance
const queryClient = createQueryClient();

/**
 * QueryProvider component
 * Wraps the app with TanStack Query's QueryClientProvider
 */
export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Export queryClient for use in hooks/components that need direct access
export { queryClient };
