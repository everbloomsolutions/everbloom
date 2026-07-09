import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, FileText, Download, TrendingUp, Calendar, Award } from 'lucide-react';
import { analyticsApi } from '../../api';
import logger from '../../utils/logger';
import { useAuth } from '../../hooks';
import { useUI } from '../../context/UIContext';
import { hasReportPermission } from '../../utils/analyticsPermissions';
import Button from '../shared/Button';

const ReportSuggestions = ({ reportType, currentFilters = {}, onGenerateReport }) => {
  const { user } = useAuth();
  const { showToast } = useUI();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        startDate: currentFilters.startDate,
        endDate: currentFilters.endDate,
        reportType,
      };
      const response = await analyticsApi.getReportSuggestions(params);
      if (response.success) {
        // Filter suggestions by user permissions (additional client-side safety check)
        const allSuggestions = response.data || [];
        const filteredSuggestions = allSuggestions.filter(suggestion => 
          user?.role && hasReportPermission(user.role, suggestion.reportType)
        );
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      logger.error('Failed to fetch report suggestions:', error);
      setSuggestions([]);
      // Don't show error toast for suggestions - it's not critical
    } finally {
      setLoading(false);
    }
  }, [reportType, currentFilters.startDate, currentFilters.endDate, user?.role]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleSuggestionClick = async (suggestion) => {
    if (onGenerateReport) {
      try {
        await onGenerateReport({
          reportType: suggestion.reportType,
          format: suggestion.format,
          filters: suggestion.suggestedFilters || currentFilters,
          options: {
            includeCharts: true,
            includeDetailedData: true,
          },
        });
        showToast(
          `Report "${suggestion.title}" generated successfully!`,
          'success',
          3000,
          'Report Generated'
        );
      } catch (error) {
        logger.error('Failed to generate report from suggestion:', error);
        showToast(
          'Failed to generate report. Please try again.',
          'error',
          4000,
          'Report Generation Failed'
        );
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-l-primary-500 bg-primary-50 dark:bg-primary-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-700';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'medium':
        return <Calendar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'low':
        return <Award className="w-4 h-4 text-primary-600 dark:text-primary-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Report Suggestions
          </h3>
        </div>
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          Loading suggestions...
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Report Suggestions
          </h3>
        </div>
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No specific suggestions available for the current view.</p>
          <p className="text-xs mt-2">You can still generate reports using the dropdown above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Report Suggestions
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Based on your current view and role, here are some suggested reports:
      </p>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`border-l-4 p-4 rounded-r-lg ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2 flex-1">
                {getPriorityIcon(suggestion.priority)}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {suggestion.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                    {suggestion.reason}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded">
                  {suggestion.format.toUpperCase()}
                </span>
                <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded capitalize">
                  {suggestion.reportType.replace('-', ' ')}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Generate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportSuggestions;
