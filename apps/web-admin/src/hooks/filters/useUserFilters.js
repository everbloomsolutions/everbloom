import { useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Initial filter state for users
 */
const initialFilters = {
  page: 1,
  limit: 10,
  search: '',
  role: '', // 'user', 'agent', 'admin', 'super_admin', or '' for all
  isActive: undefined, // true, false, or undefined for all
};

/**
 * Parse filters from URL search params
 */
const parseFiltersFromURL = (searchParams) => {
  const filters = { ...initialFilters };
  
  const page = searchParams.get('page');
  if (page) filters.page = parseInt(page, 10) || 1;
  
  const limit = searchParams.get('limit');
  if (limit) filters.limit = parseInt(limit, 10) || 10;
  
  const search = searchParams.get('search');
  if (search) filters.search = search;
  
  const role = searchParams.get('role');
  if (role) filters.role = role;
  
  const isActive = searchParams.get('isActive');
  if (isActive === 'true') filters.isActive = true;
  else if (isActive === 'false') filters.isActive = false;
  
  return filters;
};

/**
 * Build URL search params from filters
 */
const buildURLFromFilters = (filters) => {
  const params = new URLSearchParams();
  
  if (filters.page > 1) params.set('page', filters.page.toString());
  if (filters.limit !== 10) params.set('limit', filters.limit.toString());
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.isActive !== undefined) {
    params.set('isActive', filters.isActive.toString());
  }
  
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
 * Custom hook for managing user filters with URL persistence
 * @param {Object} initialState - Initial filter state
 * @param {Object} options - Options object
 * @param {boolean} options.syncWithURL - Sync filters with URL params (default: true)
 * @returns {Object} { filters, updateFilter, updateMultipleFilters, clearFilters, setPage }
 */
export const useUserFilters = (initialState = {}, options = {}) => {
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
          if (key === 'limit' && urlValue !== 10) return urlValue !== currentValue;
          if (key === 'search' && urlValue) return urlValue !== currentValue;
          if (key === 'role' && urlValue) return urlValue !== currentValue;
          if (key === 'isActive' && urlValue !== undefined) return urlValue !== currentValue;
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

export default useUserFilters;
