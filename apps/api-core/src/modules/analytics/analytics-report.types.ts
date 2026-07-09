/**
 * Analytics Report Types
 */

export type ReportType = 
  | 'my-analytics'
  | 'location'
  | 'agent'
  | 'collection'
  | 'user'
  | 'comprehensive';

export type ReportFormat = 'pdf' | 'csv';

export type UserRole = 'user' | 'agent' | 'admin' | 'super_admin';

export interface ReportGenerationRequest {
  reportType: ReportType;
  format: ReportFormat;
  userId?: string;
  role: UserRole;
  filters?: {
    startDate?: string;
    endDate?: string;
    locationType?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
  };
  options?: {
    includeCharts?: boolean;
    includeDetailedData?: boolean;
    reportTitle?: string;
  };
}

export interface ReportSuggestion {
  id: string;
  title: string;
  description: string;
  reportType: ReportType;
  format: ReportFormat;
  suggestedFilters?: {
    startDate?: string;
    endDate?: string;
    locationType?: string;
  };
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ReportMetadata {
  reportType: ReportType;
  format: ReportFormat;
  generatedAt: Date;
  generatedBy: string;
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
  filters?: Record<string, unknown>;
}
