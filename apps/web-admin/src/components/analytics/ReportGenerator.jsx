import { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { analyticsApi } from '../../api';
import logger from '../../utils/logger';
import { useAuth } from '../../hooks';
import { useUI } from '../../context/UIContext';
import { USER_ROLES } from '../../utils/constants';
import { validateReportType, validateDateRange } from '../../utils/reportValidation';
import { handleReportError } from '../../utils/reportErrorHandler';

const ReportGenerator = ({ isOpen, onClose, reportType, currentFilters = {} }) => {
  const { user } = useAuth();
  const { showToast } = useUI();
  const [format, setFormat] = useState('pdf');
  const [options, setOptions] = useState({
    includeCharts: true,
    includeDetailedData: true,
    reportTitle: '',
  });
  const [generating, setGenerating] = useState(false);
  
  const isAdmin = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
  const isAgent = user?.role === USER_ROLES.AGENT;
  const isUser = user?.role === USER_ROLES.USER;
  
  // Show time period selector for:
  // - Admin/Super Admin: All report types
  // - Agent: All report types they can access
  // - User: My Analytics only
  const showTimePeriodSelector = 
    (isAdmin && reportType) ||
    (isAgent && reportType && reportType !== 'comprehensive') ||
    (isUser && reportType === 'my-analytics');
  
  // Use current filters as initial values, but allow override
  const [reportFilters, setReportFilters] = useState({
    startDate: currentFilters.startDate || '',
    endDate: currentFilters.endDate || '',
    locationType: currentFilters.locationType || '',
    granularity: currentFilters.granularity || 'daily',
  });
  
  const [dateRangeType, setDateRangeType] = useState(currentFilters.dateRangeType || 'lastMonth');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: currentFilters.customDateRange?.startDate || '',
    endDate: currentFilters.customDateRange?.endDate || '',
  });

  // Calculate date range based on dateRangeType
  const getCalculatedDateRange = () => {
    if (!showTimePeriodSelector) {
      return { startDate: reportFilters.startDate, endDate: reportFilters.endDate };
    }
    
    const now = new Date();
    let startDate, endDate;

    switch (dateRangeType) {
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
          return { startDate: '', endDate: '' };
        }
        break;
      default:
        return { startDate: '', endDate: '' };
    }

    // Format dates as YYYY-MM-DD in local timezone (not UTC)
    const formatDateLocal = (date) => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDateLocal(startDate),
      endDate: formatDateLocal(endDate),
    };
  };

  // Update report filters when currentFilters change (when modal opens)
  useEffect(() => {
    if (isOpen) {
      setReportFilters({
        startDate: currentFilters.startDate || '',
        endDate: currentFilters.endDate || '',
        locationType: currentFilters.locationType || '',
        granularity: currentFilters.granularity || 'daily',
      });
      
      if (showTimePeriodSelector) {
        // Initialize from currentFilters if available, otherwise use defaults
        setDateRangeType(currentFilters.dateRangeType || 'lastMonth');
        setCustomDateRange({
          startDate: currentFilters.customDateRange?.startDate || '',
          endDate: currentFilters.customDateRange?.endDate || '',
        });
      } else {
        // For non-time-period-selector mode, still initialize dateRangeType if available
        // This helps with fallback scenarios
        if (currentFilters.dateRangeType) {
          setDateRangeType(currentFilters.dateRangeType);
        }
        if (currentFilters.customDateRange) {
          setCustomDateRange(currentFilters.customDateRange);
        }
      }
    }
  }, [isOpen, currentFilters, showTimePeriodSelector]);

  const handleGenerate = async () => {
    // Validate report type
    if (!reportType) {
      showToast(
        'Please select a report type',
        'error',
        3000,
        'Validation Error'
      );
      return;
    }

    // Validate report type and user permissions
    const reportTypeValidation = validateReportType(reportType, user?.role);
    if (!reportTypeValidation.valid) {
      showToast(
        reportTypeValidation.error,
        'error',
        4000,
        'Validation Error'
      );
      return;
    }

    // Validate date range
    if (showTimePeriodSelector) {
      // For time period selector, validate custom date range if custom is selected
      if (dateRangeType === 'custom') {
        const dateValidation = validateDateRange(
          customDateRange.startDate,
          customDateRange.endDate
        );
        if (!dateValidation.valid) {
          showToast(
            dateValidation.error,
            'error',
            4000,
            'Validation Error'
          );
          return;
        }
      }
    } else {
      // For direct date inputs, validate them
      const dateValidation = validateDateRange(
        reportFilters.startDate,
        reportFilters.endDate
      );
      if (!dateValidation.valid) {
        showToast(
          dateValidation.error,
          'error',
          4000,
          'Validation Error'
        );
        return;
      }
    }

    try {
      setGenerating(true);
      
      // Calculate date range based on time period selector or direct dates
      const calculatedRange = showTimePeriodSelector ? getCalculatedDateRange() : { 
        startDate: reportFilters.startDate, 
        endDate: reportFilters.endDate 
      };
      
      // Only include date filters if they have valid values (not empty strings)
      const request = {
        reportType,
        format,
        filters: {
          ...(calculatedRange.startDate && calculatedRange.startDate.trim() ? { startDate: calculatedRange.startDate } : {}),
          ...(calculatedRange.endDate && calculatedRange.endDate.trim() ? { endDate: calculatedRange.endDate } : {}),
          ...(reportFilters.locationType ? { locationType: reportFilters.locationType } : {}),
          ...(reportFilters.granularity ? { granularity: reportFilters.granularity } : {}),
        },
        options: {
          includeCharts: options.includeCharts,
          includeDetailedData: options.includeDetailedData,
          reportTitle: options.reportTitle || undefined,
        },
      };

      logger.debug('Generating report with request:', request);
      logger.debug('Report type:', reportType);
      logger.debug('Report filters:', reportFilters);
      
      const response = await analyticsApi.generateReport(request);
      
      // Validate response
      if (!response || !(response instanceof Blob)) {
        throw new Error('Invalid response format from server');
      }

      // Create blob and download
      const blob = response; // Response is already a Blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `analytics-report-${reportType}-${timestamp}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(
        `Report generated successfully! The ${format.toUpperCase()} file has been downloaded.`,
        'success',
        4000,
        'Report Generated'
      );
      onClose();
    } catch (error) {
      logger.error('Failed to generate report:', error);
      await handleReportError(error, showToast, 'Failed to generate report. Please try again.', user?.role);
    } finally {
      setGenerating(false);
    }
  };

  const getReportTypeLabel = () => {
    const labels = {
      'my-analytics': 'My Analytics',
      'location': 'Location Analytics',
      'agent': 'Agent Analytics',
      'collection': 'Collection Analytics',
      'user': 'User Analytics',
      'comprehensive': 'Comprehensive Analytics',
    };
    return labels[reportType] || reportType;
  };

  const getRoleBasedDescription = () => {
    const role = user?.role;
    const descriptions = {
      [USER_ROLES.USER]: 'Generate a report of your personal collection analytics and performance metrics.',
      [USER_ROLES.AGENT]: 'Generate reports for your team\'s analytics, user performance, or your personal metrics.',
      [USER_ROLES.ADMIN]: 'Generate comprehensive reports for locations, agents, collections, and organizational analytics.',
      [USER_ROLES.SUPER_ADMIN]: 'Generate comprehensive reports with full access to all analytics data across the organization.',
    };
    return descriptions[role] || 'Generate analytics reports based on your current view.';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report" size="md">
      <div className="space-y-6">
        {/* Role-based Description */}
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <p className="text-sm text-primary-900 dark:text-primary-300">
            {getRoleBasedDescription()}
          </p>
        </div>

        {/* Report Type Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Type
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-900 dark:text-white font-medium">
              {getReportTypeLabel()}
            </p>
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Format
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`p-4 border-2 rounded-lg transition-all ${
                format === 'pdf'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <FileText className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">PDF</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Professional format</p>
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-4 border-2 rounded-lg transition-all ${
                format === 'csv'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <Download className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">CSV</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data export</p>
            </button>
          </div>
        </div>

        {/* Options */}
        {format === 'pdf' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeCharts}
                  onChange={(e) => setOptions({ ...options, includeCharts: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include Charts
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeDetailedData}
                  onChange={(e) => setOptions({ ...options, includeDetailedData: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include Detailed Data
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Report Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Title (Optional)
          </label>
          <input
            type="text"
            value={options.reportTitle}
            onChange={(e) => setOptions({ ...options, reportTitle: e.target.value })}
            placeholder="Enter custom report title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Date Range Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Range (Optional)
          </label>
          {showTimePeriodSelector ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Time Period
                </label>
                <select
                  value={dateRangeType}
                  onChange={(e) => setDateRangeType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                >
                  <option value="today">Today</option>
                  <option value="lastWeek">Last Week</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
              {dateRangeType === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reportFilters.startDate}
                  onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={reportFilters.endDate}
                  onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
            </div>
          )}
          {(!showTimePeriodSelector && !reportFilters.startDate && !reportFilters.endDate) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Leave empty to include all available data
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={generating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportGenerator;
