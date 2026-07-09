import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';

/**
 * Custom hook for fetching location material rates
 * @param {string|null} locationId - Location ID to fetch rates for
 * @returns {Object} { ratesMap, isLoading, error, refetch }
 */
export const useLocationRates = (locationId) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['location-rates', locationId],
    queryFn: createQueryFn(() => assignApi.getLocationRates(locationId)),
    enabled: !!locationId,
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 403 (Forbidden) errors - user doesn't have permission
      if (error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  // Transform rates array into map for easy lookup by materialType
  const ratesMap = useMemo(() => {
    // If there's a 403 error, return empty map (user doesn't have permission)
    if (error?.response?.status === 403) {
      return {};
    }
    
    if (!data) return {};
    
    // Handle different response formats
    // Backend returns: { success: true, data: { locationId, rates: [...] } }
    // After adaptResponse (in createQueryFn): data = { locationId, rates: [...] }
    // So data.rates should be the array
    let rates = [];
    if (data.rates && Array.isArray(data.rates)) {
      // Standard format after adaptResponse
      rates = data.rates;
    } else if (data.success && data.data?.rates && Array.isArray(data.data.rates)) {
      // If adaptResponse wasn't applied (shouldn't happen but handle it)
      rates = data.data.rates;
    } else if (data.data?.rates && Array.isArray(data.data.rates)) {
      // Alternative nested format
      rates = data.data.rates;
    } else if (Array.isArray(data)) {
      // Data is directly an array
      rates = data;
    }
    
    // Convert array to map: { materialType: rate }
    const map = {};
    rates.forEach(rate => {
      if (rate.materialType && rate.rate !== undefined && rate.rate !== null) {
        map[rate.materialType] = rate.rate;
      }
    });
    
    return map;
  }, [data, error]);

  return {
    ratesMap,
    isLoading,
    error: error?.response?.status === 403 ? null : error, // Don't expose 403 as error
    refetch,
  };
};

export default useLocationRates;
