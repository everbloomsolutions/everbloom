import ErrorBoundary from '../components/shared/ErrorBoundary';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Skeleton from '../components/shared/Skeleton';
import Button from '../components/shared/Button';
import { useAuth, useAnalytics, useModal, useModalWithData } from '../hooks';
import { createQueryFn } from '../utils/queryAdapter';
import { analyticsApi } from '../api';
import logger from '../utils/logger';
import { USER_ROLES } from '../utils/constants';
import { formatCurrency as formatCurrencyUtil } from '../utils/formatCurrency';
import { validateReportType, validateDateRange } from '../utils/reportValidation';
import { handleReportError } from '../utils/reportErrorHandler';
import MyAnalyticsContent from '../components/analytics/MyAnalyticsContent';
import LocationAnalyticsContent from '../components/analytics/LocationAnalyticsContent';
import UserAnalyticsContent from '../components/analytics/UserAnalyticsContent';
import AgentAnalyticsContent from '../components/analytics/AgentAnalyticsContent';
import CollectionAnalyticsContent from '../components/analytics/CollectionAnalyticsContent';
import ReportSuggestions from '../components/analytics/ReportSuggestions';
import ReportGenerator from '../components/analytics/ReportGenerator';

const Analytics = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse filters from URL
  const filters = useMemo(() => ({
    tab: searchParams.get('tab') || (user?.role === USER_ROLES.USER ? 'my-analytics' : 'location'),
    dateRangeType: searchParams.get('dateRangeType') || 'lastMonth',
    locationTypeFilter: searchParams.get('locationTypeFilter') || 'all',
    granularity: searchParams.get('granularity') || 'daily',
    customStartDate: searchParams.get('customStartDate') || '',
    customEndDate: searchParams.get('customEndDate') || '',
  }), [searchParams, user?.role]);

  // Local UI state (not persisted to URL)
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('byCollections');
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(true);

  // Modal states using useModal hooks
  const { isOpen: showReportGenerator, open: openReportGenerator, close: closeReportGenerator } = useModal();
  const { data: selectedReportType, openWithData: openReportGeneratorWithType } = useModalWithData({
    onClose: () => {
      closeReportGenerator();
    },
  });

  // Custom date range object for useAnalytics hook
  const customDateRange = useMemo(() => ({
    startDate: filters.customStartDate || undefined,
    endDate: filters.customEndDate || undefined,
  }), [filters.customStartDate, filters.customEndDate]);

  // Determine available report types based on role (memoized)
  const availableReportTypes = useMemo(() => {
    const reportTypes = [];
    
    if (!user?.role) {
      return reportTypes;
    }
    
    if (user.role === USER_ROLES.USER) {
      reportTypes.push({ value: 'my-analytics', label: 'My Analytics' });
    } else {
      reportTypes.push({ value: 'location', label: 'Location Analytics' });
      
      if (user.role === USER_ROLES.AGENT) {
        reportTypes.push({ value: 'my-analytics', label: 'My Analytics' });
        reportTypes.push({ value: 'user', label: 'User Analytics' });
      }
      
      if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN) {
        reportTypes.push({ value: 'agent', label: 'Agent Analytics' });
        reportTypes.push({ value: 'collection', label: 'Collection Analytics' });
        reportTypes.push({ value: 'user', label: 'User Analytics' });
        reportTypes.push({ value: 'comprehensive', label: 'Comprehensive Report' });
      }
    }
    
    return reportTypes;
  }, [user?.role]);

  // Memoized available tabs based on role
  const availableTabs = useMemo(() => {
    const tabs = [];
    
    // User role sees only My Analytics
    if (user?.role === USER_ROLES.USER) {
      tabs.push({ id: 'my-analytics', label: 'My Analytics' });
      return tabs;
    }
    
    // All other roles see Location Analytics
    tabs.push({ id: 'location', label: 'Location Analytics' });
    
    // Agent role sees User Analytics and My Analytics
    if (user?.role === USER_ROLES.AGENT) {
      tabs.push({ id: 'my-analytics', label: 'My Analytics' });
      tabs.push({ id: 'user', label: 'User Analytics' });
    }
    
    // Admin and Super Admin see Agent Analytics
    if (user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN) {
      tabs.push({ id: 'agent', label: 'Agent Analytics' });
    }
    
    // Admin and Super Admin see Collection Analytics
    if (user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN) {
      tabs.push({ id: 'collection', label: 'Collection Analytics' });
    }
    
    // Admin and Super Admin see User Analytics (organizational view)
    if (user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN) {
      tabs.push({ id: 'user', label: 'User Analytics' });
    }
    
    return tabs;
  }, [user?.role]);
  
  // Use useAnalytics hook for analytics data fetching
  const locationAnalyticsQuery = useAnalytics('location', {
    dateRangeType: filters.dateRangeType,
    customDateRange,
    locationTypeFilter: filters.locationTypeFilter,
  });

  const myAnalyticsQuery = useAnalytics('my-analytics', {
    dateRangeType: filters.dateRangeType,
    customDateRange,
  });

  const userAnalyticsQuery = useAnalytics('user', {
    dateRangeType: filters.dateRangeType,
    customDateRange,
  });

  const agentAnalyticsQuery = useAnalytics('agent', {
    dateRangeType: filters.dateRangeType,
    customDateRange,
  });

  // Collection analytics - use direct query (simplified for now)
  const collectionAnalyticsQuery = useQuery({
    queryKey: ['analytics', 'collection', filters.dateRangeType, customDateRange.startDate, customDateRange.endDate, filters.granularity],
    queryFn: createQueryFn(() => {
      const dateRange = getDateRange();
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      params.granularity = filters.granularity;
      return analyticsApi.getCollectionAnalytics(params);
    }),
    enabled: filters.tab === 'collection',
    staleTime: 60000,
  });

  // Extract data from queries
  const locationAnalytics = filters.tab === 'location' ? locationAnalyticsQuery.data : null;
  const myAnalytics = filters.tab === 'my-analytics' ? myAnalyticsQuery.data : null;
  const userAnalytics = filters.tab === 'user' ? userAnalyticsQuery.data : null;
  const agentAnalytics = filters.tab === 'agent' ? agentAnalyticsQuery.data : null;
  const collectionAnalytics = filters.tab === 'collection' ? collectionAnalyticsQuery.data : null;

  // Loading states
  const loading = {
    location: filters.tab === 'location' ? locationAnalyticsQuery.loading : false,
    myAnalytics: filters.tab === 'my-analytics' ? myAnalyticsQuery.loading : false,
    user: filters.tab === 'user' ? userAnalyticsQuery.loading : false,
    agent: filters.tab === 'agent' ? agentAnalyticsQuery.loading : false,
    collection: filters.tab === 'collection' ? collectionAnalyticsQuery.isLoading : false,
  };

  // Error states
  const errors = {
    location: filters.tab === 'location' ? locationAnalyticsQuery.error : null,
    myAnalytics: filters.tab === 'my-analytics' ? myAnalyticsQuery.error : null,
    user: filters.tab === 'user' ? userAnalyticsQuery.error : null,
    agent: filters.tab === 'agent' ? agentAnalyticsQuery.error : null,
    collection: filters.tab === 'collection' ? collectionAnalyticsQuery.error : null,
  };

  // Memoized date range calculation
  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate, endDate;

    switch (filters.dateRangeType) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '6months':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateRange.startDate && customDateRange.endDate) {
          startDate = new Date(customDateRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          return { startDate: undefined, endDate: undefined };
        }
        break;
      default:
        return { startDate: undefined, endDate: undefined };
    }

    // Format dates as YYYY-MM-DD in local timezone (not UTC)
    const formatDateLocal = (date) => {
      if (!date) return undefined;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDateLocal(startDate),
      endDate: formatDateLocal(endDate),
    };
  }, [filters.dateRangeType, customDateRange.startDate, customDateRange.endDate]);

  // Filter handlers with URL persistence
  const handleTabChange = useCallback((tab) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    });
  }, [setSearchParams]);

  const handleFilterChange = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== 'lastMonth' && value !== 'daily') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const handleDateRangeChange = useCallback((type, customStartDate, customEndDate) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('dateRangeType', type);
      if (type === 'custom') {
        if (customStartDate) newParams.set('customStartDate', customStartDate);
        else newParams.delete('customStartDate');
        if (customEndDate) newParams.set('customEndDate', customEndDate);
        else newParams.delete('customEndDate');
      } else {
        newParams.delete('customStartDate');
        newParams.delete('customEndDate');
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Initialize selected report type when user role or available types change
  useEffect(() => {
    if (availableReportTypes.length > 0) {
      const currentValue = selectedReportType;
      const isValid = currentValue && availableReportTypes.find(rt => rt.value === currentValue);
      
      if (!currentValue || !isValid) {
        // Auto-select first available option
        openReportGeneratorWithType(availableReportTypes[0].value);
      }
    } else if (selectedReportType) {
      // Clear selection if no types available
      closeReportGenerator();
    }
  }, [user?.role, availableReportTypes, selectedReportType, openReportGeneratorWithType, closeReportGenerator]);

  // Format helpers - using utility function
  const formatCurrency = useCallback((amount) => {
    return formatCurrencyUtil(amount, { maximumFractionDigits: 0 });
  }, []);

  const formatPercentage = useCallback((value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }, []);

  // getMaterialTypeLabel is now imported from types/collections

  // Memoized current filters for report generation
  const getCurrentFilters = useCallback(() => {
    // Use dateRangeType-based calculation for all roles
    const calculatedRange = getDateRange();
    
    return {
      startDate: calculatedRange.startDate || undefined,
      endDate: calculatedRange.endDate || undefined,
      locationType: filters.locationTypeFilter !== 'all' ? filters.locationTypeFilter : undefined,
      granularity: filters.granularity,
      dateRangeType: filters.dateRangeType,
      customDateRange: filters.dateRangeType === 'custom' ? customDateRange : undefined,
    };
  }, [filters.dateRangeType, filters.locationTypeFilter, filters.granularity, customDateRange, getDateRange]);

  // Handle report generation from suggestions
  const handleGenerateReportFromSuggestion = useCallback(async (request) => {
    try {
      if (!request || !request.reportType) {
        throw new Error('Report type is required');
      }

      // Validate report type and permissions
      if (!user || !user.role) {
        throw new Error('User role is required. Please refresh the page and try again.');
      }

      const reportTypeValidation = validateReportType(request.reportType, user.role);
      if (!reportTypeValidation.valid) {
        throw new Error(reportTypeValidation.error);
      }

      // Validate date range if provided
      if (request.filters && (request.filters.startDate || request.filters.endDate)) {
        const dateValidation = validateDateRange(
          request.filters.startDate,
          request.filters.endDate
        );
        if (!dateValidation.valid) {
          throw new Error(dateValidation.error);
        }
      }

      logger.debug('Generating report from suggestion:', request);
      const response = await analyticsApi.generateReport(request);
      
      // Validate response
      if (!response || !(response instanceof Blob)) {
        throw new Error('Invalid response format from server');
      }

      // Create blob and download
      const blob = response; // Response is already a Blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `analytics-report-${request.reportType}-${timestamp}.${request.format || 'pdf'}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Success feedback is handled in ReportSuggestions component
      return Promise.resolve();
    } catch (error) {
      logger.error('Failed to generate report from suggestion:', error);
      
      // Use centralized error handler to parse error with role-specific messages
      try {
        const errorMessage = await handleReportError(error, null, 'Failed to generate report. Please try again.', user?.role); // Don't show toast here, let ReportSuggestions handle it
        // Re-throw error so ReportSuggestions can handle it
        throw new Error(errorMessage);
      } catch (_parseError) {
        // If error parsing fails, throw original error
        throw error;
      }
    }
  }, [user]);

  // Determine if initial loading (no data loaded yet) - MUST be after all hooks
  const isInitialLoading = !locationAnalytics && !userAnalytics && !myAnalytics && !agentAnalytics && !collectionAnalytics && 
    (loading.location || loading.user || loading.myAnalytics || loading.agent || loading.collection);
  
  // Early return AFTER all hooks - this is safe now
  if (isInitialLoading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.role === USER_ROLES.USER 
              ? 'Your personal analytics and performance insights'
              : user?.role === USER_ROLES.AGENT
              ? 'Team analytics, user performance, and your personal metrics'
              : 'Comprehensive analytics and insights across your organization'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {availableReportTypes.length > 0 ? (
            <>
              <select
                value={selectedReportType || ''}
                onChange={(e) => openReportGeneratorWithType(e.target.value)}
                className="px-4 py-2 min-w-[200px] border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-medium"
              >
                <option value="">Select Report Type</option>
                {availableReportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  if (selectedReportType) {
                    openReportGenerator();
                  }
                }}
                variant="primary"
                icon={FileText}
                disabled={!selectedReportType}
                title={selectedReportType ? "Generate a report of the selected type" : "Please select a report type first"}
              >
                Generate Report
              </Button>
            </>
          ) : user?.role ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No report types available for your role
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading report options...
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filters.tab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* My Analytics Tab (for user/agent role) */}
      {filters.tab === 'my-analytics' && (
        <MyAnalyticsContent
          analytics={myAnalytics}
          dateRangeType={filters.dateRangeType}
          setDateRangeType={(type) => handleDateRangeChange(type, customDateRange.startDate, customDateRange.endDate)}
          customDateRange={customDateRange}
          setCustomDateRange={(start, end) => handleDateRangeChange('custom', start, end)}
          loading={loading.myAnalytics}
          error={errors.myAnalytics}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Location Analytics Tab */}
      {filters.tab === 'location' && (
        <LocationAnalyticsContent
          analytics={locationAnalytics}
          dateRangeType={filters.dateRangeType}
          setDateRangeType={(type) => handleDateRangeChange(type, customDateRange.startDate, customDateRange.endDate)}
          customDateRange={customDateRange}
          setCustomDateRange={(start, end) => handleDateRangeChange('custom', start, end)}
          locationTypeFilter={filters.locationTypeFilter}
          setLocationTypeFilter={(value) => handleFilterChange('locationTypeFilter', value)}
          loading={loading.location}
          error={errors.location}
          userRole={user?.role}
        />
      )}

      {/* User Analytics Tab (for agents) */}
      {filters.tab === 'user' && (
        <UserAnalyticsContent
          analytics={userAnalytics}
          loading={loading.user}
          error={errors.user}
        />
      )}

      {/* Agent Analytics Tab (for admin/super admin) */}
      {filters.tab === 'agent' && (
        <AgentAnalyticsContent
          analytics={agentAnalytics}
          dateRangeType={filters.dateRangeType}
          setDateRangeType={(type) => handleDateRangeChange(type, customDateRange.startDate, customDateRange.endDate)}
          customDateRange={customDateRange}
          setCustomDateRange={(start, end) => handleDateRangeChange('custom', start, end)}
          selectedLeaderboard={selectedLeaderboard}
          setSelectedLeaderboard={setSelectedLeaderboard}
          loading={loading.agent}
          error={errors.agent}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Collection Analytics Tab */}
      {filters.tab === 'collection' && (
        <CollectionAnalyticsContent
          analytics={collectionAnalytics}
          dateRangeType={filters.dateRangeType}
          setDateRangeType={(type) => handleDateRangeChange(type, customDateRange.startDate, customDateRange.endDate)}
          customDateRange={customDateRange}
          setCustomDateRange={(start, end) => handleDateRangeChange('custom', start, end)}
          granularity={filters.granularity}
          setGranularity={(value) => handleFilterChange('granularity', value)}
          loading={loading.collection}
          error={errors.collection}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      )}

      {/* Report Suggestions - At the bottom for all roles */}
      <div className="mb-6 mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Report Suggestions
          </h3>
          <button
            onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={suggestionsCollapsed ? 'Show report suggestions' : 'Hide report suggestions'}
          >
            {suggestionsCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
            </>
          )}
          </button>
        </div>
        {!suggestionsCollapsed && (
          <ReportSuggestions
            reportType={selectedReportType || availableReportTypes[0]?.value || 'my-analytics'}
            currentFilters={getCurrentFilters()}
            onGenerateReport={handleGenerateReportFromSuggestion}
          />
              )}
            </div>

      {/* Report Generator Modal */}
      <ReportGenerator
        isOpen={showReportGenerator}
        onClose={closeReportGenerator}
        reportType={selectedReportType || availableReportTypes[0]?.value || 'my-analytics'}
        currentFilters={getCurrentFilters()}
      />
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const AnalyticsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Analytics"
      message="Something went wrong while loading the analytics page. Please try refreshing the page."
    >
      <Analytics />
    </ErrorBoundary>
  );
};

export default AnalyticsWithErrorBoundary;
