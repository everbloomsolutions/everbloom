/**
 * Analytics Report Controller
 * HTTP handlers for analytics report generation
 */

import { Request, Response, NextFunction } from 'express';
import { analyticsReportService } from './analytics-report.service';
import { ReportGenerationRequest, ReportType } from './analytics-report.types';
import { AppError } from '../../common/exceptions/app-error';
import { 
  VALID_REPORT_TYPES, 
  hasReportPermission,
  getAllowedReportTypes 
} from './analytics-permissions.constants';
import { getAccessDeniedMessage, getInvalidReportTypeMessage, getMissingRoleMessage } from './analytics-error-messages';

/**
 * Validate report type and user permissions
 */
const validateReportAccess = (reportType: string, userRole: string): void => {
  if (!VALID_REPORT_TYPES.includes(reportType as ReportType)) {
    throw new AppError(getInvalidReportTypeMessage(reportType), 400);
  }

  const allowedTypes = getAllowedReportTypes(userRole);
  if (!allowedTypes || allowedTypes.length === 0) {
    throw new AppError(getMissingRoleMessage(), 400);
  }

  if (!hasReportPermission(userRole, reportType as ReportType)) {
    const errorMessage = getAccessDeniedMessage(userRole, reportType, 'generate');
    throw new AppError(errorMessage, 403);
  }
};

/**
 * Validate date range
 */
const validateDateRange = (startDate?: string, endDate?: string): void => {
  // If both dates are empty, that's valid (means all data)
  if (!startDate && !endDate) {
    return;
  }

  // If only one date is provided, that's invalid
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new AppError('Both start date and end date must be provided, or leave both empty', 400);
  }

  if (!startDate || !endDate) {
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid date format', 400);
  }

  // Check if end date is before start date
  if (end < start) {
    throw new AppError('End date must be after or equal to start date', 400);
  }

  // Check if dates are in the future
  if (start > today || end > today) {
    throw new AppError('Dates cannot be in the future', 400);
  }

  // Check if date range is too large (more than 10 years)
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const maxDays = 3650; // 10 years
  if (daysDiff > maxDays) {
    throw new AppError(`Date range cannot exceed ${maxDays / 365} years`, 400);
  }
};

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: Express.User;
}

/**
 * Generate analytics report
 * POST /api/v1/admin/analytics/reports/generate
 */
export const generateReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const reportType = req.body.reportType;
    const userRole = req.user.role as string;

    // Validate report type and user permissions
    validateReportAccess(reportType, userRole);

    // Validate date range
    if (req.body.filters) {
      validateDateRange(req.body.filters.startDate, req.body.filters.endDate);
    }

    // Validate format
    if (!['pdf', 'csv'].includes(req.body.format)) {
      throw new AppError('Invalid format. Must be pdf or csv', 400);
    }

    const request: ReportGenerationRequest = {
      reportType: reportType as ReportType,
      format: req.body.format as 'pdf' | 'csv',
      userId: req.user._id.toString(),
      role: userRole as 'user' | 'agent' | 'admin' | 'super_admin',
      filters: req.body.filters,
      options: req.body.options,
    };

    const result = await analyticsReportService.generateReport(request);

    if (request.format === 'pdf') {
      const filename = `analytics-report-${request.reportType}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    } else {
      const filename = `analytics-report-${request.reportType}-${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get report suggestions
 * GET /api/v1/admin/analytics/reports/suggestions
 */
export const getReportSuggestions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      reportType: req.query.reportType as ReportType | undefined,
    };

    const suggestions = await analyticsReportService.getReportSuggestions(
      req.user._id.toString(),
      req.user.role as 'user' | 'agent' | 'admin' | 'super_admin',
      filters
    );

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export report by type (quick export)
 * GET /api/v1/admin/analytics/reports/:reportType/export/:format
 */
export const exportReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const reportType = req.params.reportType;
    const format = req.params.format as 'pdf' | 'csv';
    const userRole = req.user.role as string;

    if (!['pdf', 'csv'].includes(format)) {
      throw new AppError('Invalid format. Must be pdf or csv', 400);
    }

    // Validate report type and user permissions
    validateReportAccess(reportType, userRole);

    // Validate date range
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    validateDateRange(startDate, endDate);

    const request: ReportGenerationRequest = {
      reportType: reportType as ReportType,
      format,
      userId: req.user._id.toString(),
      role: userRole as 'user' | 'agent' | 'admin' | 'super_admin',
      filters: {
        startDate,
        endDate,
        locationType: req.query.locationType as string | undefined,
        granularity: req.query.granularity as 'daily' | 'weekly' | 'monthly' | undefined,
      },
      options: {
        includeCharts: req.query.includeCharts === 'true',
        includeDetailedData: req.query.includeDetailedData === 'true',
        reportTitle: req.query.reportTitle as string | undefined,
      },
    };

    const result = await analyticsReportService.generateReport(request);

    if (format === 'pdf') {
      const filename = `analytics-${reportType}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    } else {
      const filename = `analytics-${reportType}-${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    }
  } catch (error) {
    next(error);
  }
};

export const analyticsReportController = {
  generateReport,
  getReportSuggestions,
  exportReport,
};
