import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import { AnalyticsReportService } from './analytics.report.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportSuggestionsQueryDto } from './dto/report-suggestions-query.dto';
import { ExportReportQueryDto } from './dto/export-report-query.dto';
import { ReportType } from './analytics-report.types';
import {
  VALID_REPORT_TYPES,
  hasReportPermission,
  getAllowedReportTypes,
} from './analytics-permissions.constants';
import {
  getAccessDeniedMessage,
  getInvalidReportTypeMessage,
  getMissingRoleMessage,
} from './analytics-error-messages';

@Controller('admin/analytics/reports')
@UseGuards(AuthGuard)
export class AnalyticsReportController {
  constructor(private readonly analyticsReportService: AnalyticsReportService) {}

  /**
   * Validate report type and user permissions
   */
  private validateReportAccess(reportType: string, userRole: string): void {
    if (!VALID_REPORT_TYPES.includes(reportType as ReportType)) {
      throw new BadRequestException(getInvalidReportTypeMessage(reportType));
    }

    const allowedTypes = getAllowedReportTypes(userRole);
    if (!allowedTypes || allowedTypes.length === 0) {
      throw new BadRequestException(getMissingRoleMessage());
    }

    if (!hasReportPermission(userRole, reportType as ReportType)) {
      const errorMessage = getAccessDeniedMessage(userRole, reportType, 'generate');
      throw new ForbiddenException(errorMessage);
    }
  }

  /**
   * Validate date range
   */
  private validateDateRange(startDate?: string, endDate?: string): void {
    if (!startDate && !endDate) {
      return;
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new BadRequestException('Both start date and end date must be provided, or leave both empty');
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }
    }
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateReport(
    @Body() generateReportDto: GenerateReportDto,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const userRole = user.role as string;

    // Validate report type and user permissions
    this.validateReportAccess(generateReportDto.reportType, userRole);

    // Validate date range
    if (generateReportDto.filters) {
      this.validateDateRange(
        generateReportDto.filters.startDate,
        generateReportDto.filters.endDate,
      );
    }

    const request = {
      reportType: generateReportDto.reportType,
      format: generateReportDto.format,
      userId: user._id.toString(),
      role: user.role as 'user' | 'agent' | 'admin' | 'super_admin',
      filters: generateReportDto.filters,
      options: generateReportDto.options,
    };

    const result = await this.analyticsReportService.generateReport(request);

    if (generateReportDto.format === 'pdf') {
      const filename = `analytics-report-${generateReportDto.reportType}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    } else {
      const filename = `analytics-report-${generateReportDto.reportType}-${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    }
  }

  @Get('suggestions')
  async getReportSuggestions(
    @Query() query: ReportSuggestionsQueryDto,
    @CurrentUser() user: UserDocument,
  ) {
    const suggestions = await this.analyticsReportService.getReportSuggestions(
      user._id.toString(),
      user.role as 'user' | 'agent' | 'admin' | 'super_admin',
      {
        startDate: query.startDate,
        endDate: query.endDate,
        reportType: query.reportType,
      },
    );

    return {
      success: true,
      data: suggestions,
    };
  }

  @Get(':reportType/export/:format')
  @HttpCode(HttpStatus.OK)
  async exportReport(
    @Param('reportType') reportType: string,
    @Param('format') format: string,
    @Query() query: ExportReportQueryDto,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    if (!['pdf', 'csv'].includes(format)) {
      throw new BadRequestException('Invalid format. Must be pdf or csv');
    }

    const userRole = user.role as string;

    // Validate report type and user permissions
    this.validateReportAccess(reportType, userRole);

    // Validate date range
    this.validateDateRange(query.startDate, query.endDate);

    const request = {
      reportType: reportType as ReportType,
      format: format as 'pdf' | 'csv',
      userId: user._id.toString(),
      role: user.role as 'user' | 'agent' | 'admin' | 'super_admin',
      filters: {
        startDate: query.startDate,
        endDate: query.endDate,
        locationType: query.locationType,
        granularity: query.granularity,
      },
      options: {
        includeCharts: query.includeCharts,
        includeDetailedData: query.includeDetailedData,
        reportTitle: query.reportTitle,
      },
    };

    const result = await this.analyticsReportService.generateReport(request);

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
  }
}
