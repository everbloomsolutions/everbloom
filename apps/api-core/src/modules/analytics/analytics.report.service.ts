import { Injectable } from '@nestjs/common';
import * as analyticsReportService from './analytics-report.service';
import { ReportGenerationRequest, ReportSuggestion, ReportType } from './analytics-report.types';

@Injectable()
export class AnalyticsReportService {
  async generateReport(request: ReportGenerationRequest): Promise<Buffer | string> {
    return analyticsReportService.generateReport(request);
  }

  async getReportSuggestions(
    userId: string,
    role: 'user' | 'agent' | 'admin' | 'super_admin',
    filters?: {
      startDate?: string;
      endDate?: string;
      reportType?: ReportType;
    },
  ): Promise<ReportSuggestion[]> {
    return analyticsReportService.getReportSuggestions(userId, role, filters as any);
  }
}
