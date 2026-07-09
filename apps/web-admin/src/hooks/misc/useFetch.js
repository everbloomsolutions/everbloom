import { useState, useEffect } from 'react';
import { handleApiError } from '../../utils/errorHandler';

/**
 * @deprecated This hook violates admin-rules.md: "Never use useState + useEffect for data fetching - always use TanStack Query"
 * 
 * This hook is deprecated and should not be used. Instead, use TanStack Query's useQuery hook
 * with the createQueryFn adapter pattern.
 * 
 * Migration example:
 * 
 * OLD:
 * const { data, loading, error, refetch } = useFetch(() => api.getData(), [dependency]);
 * 
 * NEW:
 * const { data, isLoading: loading, error, refetch } = useQuery({
 *   queryKey: ['resource', dependency],
 *   queryFn: createQueryFn(() => api.getData()),
 *   staleTime: 30000,
 * });
 * 
 * See admin-rules.md for more details on TanStack Query patterns.
 */
export const useFetch = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchFunction();
        if (isMounted) {
          setData(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          handleApiError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // fetchFunction is intentionally excluded from deps as it may be recreated on each render
    // The hook is designed to refetch when dependencies change, not when fetchFunction changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchFunction();
      setData(response.data);
    } catch (err) {
      setError(err);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

export default useFetch;
