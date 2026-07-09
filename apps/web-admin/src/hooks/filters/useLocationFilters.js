import { useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Initial filter state for locations
 */
const initialFilters = {
  page: 1,
  limit: 20,
  search: '',
  locationType: 'all',
  status: 'all', // 'all', 'active', 'inactive'
  city: '',
  state: '',
  sortBy: 'newest', // 'newest', 'oldest', 'name-asc', 'name-desc', 'usage-high', 'usage-low'
  minUsageCount: '',
  maxUsageCount: '',
  neverUsed: false,
};

/**
 * Parse filters from URL search params
 */
const parseFiltersFromURL = (searchParams) => {
  const filters = { ...initialFilters };
  
  const page = searchParams.get('page');
  if (page) filters.page = parseInt(page, 10) || 1;
  
  const limit = searchParams.get('limit');
  if (limit) filters.limit = parseInt(limit, 10) || 20;
  
  const search = searchParams.get('search');
  if (search) filters.search = search;
  
  const locationType = searchParams.get('locationType');
  if (locationType) filters.locationType = locationType;
  
  const status = searchParams.get('status');
  if (status) filters.status = status;
  
  const city = searchParams.get('city');
  if (city) filters.city = city;
  
  const state = searchParams.get('state');
  if (state) filters.state = state;
  
  const sortBy = searchParams.get('sortBy');
  if (sortBy) filters.sortBy = sortBy;
  
  const minUsageCount = searchParams.get('minUsageCount');
  if (minUsageCount) filters.minUsageCount = minUsageCount;
  
  const maxUsageCount = searchParams.get('maxUsageCount');
  if (maxUsageCount) filters.maxUsageCount = maxUsageCount;
  
  const neverUsed = searchParams.get('neverUsed');
  if (neverUsed === 'true') filters.neverUsed = true;
  
  return filters;
};

/**
 * Build URL search params from filters
 */
const buildURLFromFilters = (filters) => {
  const params = new URLSearchParams();
  
  if (filters.page > 1) params.set('page', filters.page.toString());
  if (filters.limit !== 20) params.set('limit', filters.limit.toString());
  if (filters.search) params.set('search', filters.search);
  if (filters.locationType !== 'all') params.set('locationType', filters.locationType);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.city) params.set('city', filters.city);
  if (filters.state) params.set('state', filters.state);
  if (filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy);
  if (filters.minUsageCount) params.set('minUsageCount', filters.minUsageCount);
  if (filters.maxUsageCount) params.set('maxUsageCount', filters.maxUsageCount);
  if (filters.neverUsed) params.set('neverUsed', 'true');
  
  return params;
};

/**
 * Filter reducer
 */
const filtersReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE':
      return {
        ...state,
        [action.key]: action.value,
      };
    case 'UPDATE_MULTIPLE':
      return {
        ...state,
        ...action.updates,
      };
    case 'RESET':
      return { ...initialFilters };
    case 'SET_PAGE':
      return {
        ...state,
        page: action.page,
      };
    default:
      return state;
  }
};

/**
 * Custom hook for managing location filters with URL persistence
 * @param {Object} initialState - Initial filter state
 * @param {Object} options - Options object
 * @param {boolean} options.syncWithURL - Sync filters with URL params (default: true)
 * @returns {Object} { filters, updateFilter, updateMultipleFilters, clearFilters, setPage }
 */
export const useLocationFilters = (initialState = {}, options = {}) => {
  const { syncWithURL = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL or initialState
  const getInitialFilters = useCallback(() => {
    if (syncWithURL && searchParams.toString()) {
      return parseFiltersFromURL(searchParams);
    }
    return { ...initialFilters, ...initialState };
  }, [syncWithURL, searchParams, initialState]);
  
  const [filters, dispatch] = useReducer(filtersReducer, getInitialFilters());
  
  // Sync filters to URL when they change
  useEffect(() => {
    if (syncWithURL) {
      const params = buildURLFromFilters(filters);
      const newURL = params.toString();
      const currentURL = searchParams.toString();
      
      // Only update URL if it's different to avoid unnecessary navigation
      if (newURL !== currentURL) {
        setSearchParams(params, { replace: true });
      }
    }
  }, [filters, syncWithURL, searchParams, setSearchParams]);
  
  // Sync URL changes back to filters (e.g., browser back/forward)
  useEffect(() => {
    if (syncWithURL) {
      const urlFilters = parseFiltersFromURL(searchParams);
      // Check if URL has meaningful changes
      const hasChanges = Object.keys(urlFilters).some(
        key => {
          const urlValue = urlFilters[key];
          const currentValue = filters[key];
          // Only consider it a change if URL has a non-default value
          if (key === 'page' && urlValue !== 1) return urlValue !== currentValue;
          if (key === 'limit' && urlValue !== 20) return urlValue !== currentValue;
          if (key === 'search' && urlValue) return urlValue !== currentValue;
          if (key === 'locationType' && urlValue !== 'all') return urlValue !== currentValue;
          if (key === 'status' && urlValue !== 'all') return urlValue !== currentValue;
          if (key === 'city' && urlValue) return urlValue !== currentValue;
          if (key === 'state' && urlValue) return urlValue !== currentValue;
          if (key === 'sortBy' && urlValue !== 'newest') return urlValue !== currentValue;
          if (key === 'minUsageCount' && urlValue) return urlValue !== currentValue;
          if (key === 'maxUsageCount' && urlValue) return urlValue !== currentValue;
          if (key === 'neverUsed' && urlValue) return urlValue !== currentValue;
          return false;
        }
      );
      
      if (hasChanges) {
        dispatch({ type: 'UPDATE_MULTIPLE', updates: urlFilters });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), syncWithURL]); // Only depend on URL string, not filters

  const updateFilter = useCallback((key, value) => {
    dispatch({ type: 'UPDATE', key, value });
    // Reset to page 1 when filters change (except page itself)
    if (key !== 'page') {
      dispatch({ type: 'SET_PAGE', page: 1 });
    }
  }, []);

  const updateMultipleFilters = useCallback((updates) => {
    dispatch({ type: 'UPDATE_MULTIPLE', updates });
    // Reset to page 1 if any filter changed (except page)
    if (!updates.page) {
      dispatch({ type: 'SET_PAGE', page: 1 });
    }
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setPage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  return {
    filters,
    updateFilter,
    updateMultipleFilters,
    clearFilters,
    setPage,
  };
};

export default useLocationFilters;
