import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for pagination logic
 * 
 * @param {Object} options - Options object
 * @param {number} options.initialPage - Initial page number (default: 1)
 * @param {number} options.initialLimit - Initial items per page (default: 10)
 * @param {number} options.totalItems - Total number of items
 * @param {number} options.totalPages - Total number of pages (calculated if not provided)
 * @returns {Object} { page, limit, totalPages, totalItems, setPage, setLimit, goToPage, nextPage, prevPage, canGoNext, canGoPrev, offset }
 */
export const usePagination = (options = {}) => {
  const {
    initialPage = 1,
    initialLimit = 10,
    totalItems = 0,
    totalPages: providedTotalPages = null,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  // Calculate total pages if not provided
  const totalPages = useMemo(() => {
    if (providedTotalPages !== null) {
      return providedTotalPages;
    }
    return Math.ceil(totalItems / limit) || 1;
  }, [providedTotalPages, totalItems, limit]);

  // Calculate offset for API calls
  const offset = useMemo(() => {
    return (page - 1) * limit;
  }, [page, limit]);

  // Navigation helpers
  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  // Validation helpers
  const canGoNext = useMemo(() => {
    return page < totalPages;
  }, [page, totalPages]);

  const canGoPrev = useMemo(() => {
    return page > 1;
  }, [page]);

  // Reset to page 1 when limit changes
  const handleSetLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return {
    page,
    limit,
    totalPages,
    totalItems,
    setPage,
    setLimit: handleSetLimit,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    offset,
  };
};

export default usePagination;
