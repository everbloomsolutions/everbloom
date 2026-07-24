import { Injectable } from '@nestjs/common';
import * as analyticsReportService from './analytics-report.service';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { ReportGenerationRequest, ReportSuggestion, ReportType } from './analytics-report.types';

@Injectable()
export class AnalyticsReportService {
  constructor(private readonly databaseService: DatabaseService) {}

  async generateReport(request: ReportGenerationRequest): Promise<Buffer | string> {
    await this.databaseService.ensureConnectionReady();
    const verifiedConnection = this.databaseService.getConnection();
    return analyticsReportService.generateReport(request, verifiedConnection);
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
    await this.databaseService.ensureConnectionReady();
    return analyticsReportService.getReportSuggestions(userId, role, filters as any);
  }
}
