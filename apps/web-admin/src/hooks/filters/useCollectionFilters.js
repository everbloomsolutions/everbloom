import { useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Initial filter state
 */
const initialFilters = {
  page: 1,
  limit: 10,
  search: '',
  locationType: 'all',
  status: 'all', // 'all', 'with-receipt', 'without-receipt'
  agentFilter: 'all',
  sortBy: 'newest', // 'newest', 'oldest', 'amount-high', 'amount-low', 'weight-high', 'weight-low'
  startDate: '',
  endDate: '',
  timePeriod: 'all', // 'all', 'today', 'lastWeek', 'lastMonth', 'last3Months'
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
  
  const locationType = searchParams.get('locationType');
  if (locationType) filters.locationType = locationType;
  
  const status = searchParams.get('status');
  if (status) filters.status = status;
  
  const agentFilter = searchParams.get('agentFilter');
  if (agentFilter) filters.agentFilter = agentFilter;
  
  const sortBy = searchParams.get('sortBy');
  if (sortBy) filters.sortBy = sortBy;
  
  const startDate = searchParams.get('startDate');
  if (startDate) filters.startDate = startDate;
  
  const endDate = searchParams.get('endDate');
  if (endDate) filters.endDate = endDate;
  
  const timePeriod = searchParams.get('timePeriod');
  if (timePeriod) filters.timePeriod = timePeriod;
  
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
  if (filters.locationType !== 'all') params.set('locationType', filters.locationType);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.agentFilter !== 'all') params.set('agentFilter', filters.agentFilter);
  if (filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.timePeriod !== 'all') params.set('timePeriod', filters.timePeriod);
  
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
 * Custom hook for managing collection filters with URL persistence
 * @param {Object} initialState - Initial filter state
 * @param {Object} options - Options object
 * @param {boolean} options.syncWithURL - Sync filters with URL params (default: true)
 * @returns {Object} { filters, updateFilter, updateMultipleFilters, clearFilters, setPage }
 */
export const useCollectionFilters = (initialState = {}, options = {}) => {
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
  // Only sync on mount or when URL params change externally
  useEffect(() => {
    if (syncWithURL) {
      const urlFilters = parseFiltersFromURL(searchParams);
      // Check if URL has meaningful changes (ignore default values)
      const hasChanges = Object.keys(urlFilters).some(
        key => {
          const urlValue = urlFilters[key];
          const currentValue = filters[key];
          // Only consider it a change if URL has a non-default value
          if (key === 'page' && urlValue !== 1) return urlValue !== currentValue;
          if (key === 'limit' && urlValue !== 10) return urlValue !== currentValue;
          if (key === 'search' && urlValue) return urlValue !== currentValue;
          if (key === 'locationType' && urlValue !== 'all') return urlValue !== currentValue;
          if (key === 'status' && urlValue !== 'all') return urlValue !== currentValue;
          if (key === 'agentFilter' && urlValue !== 'all') return urlValue !== currentValue;
          if (key === 'sortBy' && urlValue !== 'newest') return urlValue !== currentValue;
          if (key === 'startDate' && urlValue) return urlValue !== currentValue;
          if (key === 'endDate' && urlValue) return urlValue !== currentValue;
          if (key === 'timePeriod' && urlValue !== 'all') return urlValue !== currentValue;
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
