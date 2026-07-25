import { useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Initial filter state for audit logs
 */
const initialFilters = {
  page: 1,
  entityType: '',
  action: '',
  search: '',
  startDate: '',
  endDate: '',
};

/**
 * Parse filters from URL search params
 */
const parseFiltersFromURL = (searchParams) => {
  const filters = { ...initialFilters };

  const page = searchParams.get('page');
  if (page) filters.page = parseInt(page, 10) || 1;

  const entityType = searchParams.get('entityType');
  if (entityType) filters.entityType = entityType;

  const action = searchParams.get('action');
  if (action) filters.action = action;

  const search = searchParams.get('search');
  if (search) filters.search = search;

  const startDate = searchParams.get('startDate');
  if (startDate) filters.startDate = startDate;

  const endDate = searchParams.get('endDate');
  if (endDate) filters.endDate = endDate;

  return filters;
};

/**
 * Build URL search params from filters
 */
const buildURLFromFilters = (filters) => {
  const params = new URLSearchParams();

  if (filters.page > 1) params.set('page', filters.page.toString());
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.action) params.set('action', filters.action);
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  return params;
};

/**
 * Filter reducer
 */
const filtersReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, [action.key]: action.value };
    case 'UPDATE_MULTIPLE':
      return { ...state, ...action.updates };
    case 'RESET':
      return { ...initialFilters };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    default:
      return state;
  }
};

/**
 * Custom hook for managing audit log filters with URL persistence
 */
export const useAuditFilters = (initialState = {}, options = {}) => {
  const { syncWithURL = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialFilters = useCallback(() => {
    if (syncWithURL && searchParams.toString()) {
      return parseFiltersFromURL(searchParams);
    }
    return { ...initialFilters, ...initialState };
  }, [syncWithURL, searchParams, initialState]);

  const [filters, dispatch] = useReducer(filtersReducer, getInitialFilters());

  // Sync filters to URL when they change
  useEffect(() => {
    if (!syncWithURL) return;

    const params = buildURLFromFilters(filters);
    const newURL = params.toString();
    const currentURL = searchParams.toString();

    if (newURL !== currentURL) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, syncWithURL, searchParams, setSearchParams]);

  // Sync URL changes back to filters (e.g., browser back/forward)
  useEffect(() => {
    if (!syncWithURL) return;

    const urlFilters = parseFiltersFromURL(searchParams);
    const hasChanges = Object.keys(urlFilters).some((key) => {
      const urlValue = urlFilters[key];
      const currentValue = filters[key];

      if (key === 'page' && urlValue !== 1) return urlValue !== currentValue;
      if (['entityType', 'action', 'search', 'startDate', 'endDate'].includes(key) && urlValue) {
        return urlValue !== currentValue;
      }
      return false;
    });

    if (hasChanges) {
      dispatch({ type: 'UPDATE_MULTIPLE', updates: urlFilters });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), syncWithURL]);

  const updateFilter = useCallback((key, value) => {
    // Validate date range: keep start <= end
    if (key === 'startDate') {
      const currentEnd = filters.endDate;
      if (value && currentEnd && value > currentEnd) {
        dispatch({ type: 'UPDATE_MULTIPLE', updates: { startDate: value, endDate: value, page: 1 } });
        return;
      }
    }

    if (key === 'endDate') {
      const currentStart = filters.startDate;
      if (value && currentStart && currentStart > value) {
        dispatch({ type: 'UPDATE_MULTIPLE', updates: { startDate: value, endDate: value, page: 1 } });
        return;
      }
    }

    dispatch({ type: 'UPDATE', key, value });

    // Reset to page 1 when filters change (except page itself)
    if (key !== 'page') {
      dispatch({ type: 'SET_PAGE', page: 1 });
    }
  }, [filters.endDate, filters.startDate]);

  const updateMultipleFilters = useCallback((updates) => {
    dispatch({ type: 'UPDATE_MULTIPLE', updates });

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

export default useAuditFilters;
