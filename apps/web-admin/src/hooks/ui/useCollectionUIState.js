import { useState, useCallback } from 'react';

/**
 * Custom hook for managing Collections page UI state
 * Consolidates UI-related state (filters visibility, export format, time period)
 */
export const useCollectionUIState = () => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', 'today', 'lastWeek', 'lastMonth', 'last3Months'

  const toggleAdvancedFilters = useCallback((newValue) => {
    if (typeof newValue === 'boolean') {
      setShowAdvancedFilters(newValue);
    } else {
      setShowAdvancedFilters(prev => !prev);
    }
  }, []);

  return {
    showAdvancedFilters,
    toggleAdvancedFilters,
    exportFormat,
    setExportFormat,
    timePeriod,
    setTimePeriod,
  };
};

export default useCollectionUIState;
