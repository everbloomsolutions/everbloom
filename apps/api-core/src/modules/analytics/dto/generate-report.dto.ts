import { IsEnum, IsOptional, IsString, IsBoolean, IsObject, ValidateIf } from 'class-validator';
import { ReportType, ReportFormat } from '../analytics-report.types';

export class ReportFiltersDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.startDate !== undefined)
  endDate?: string;

  @IsOptional()
  @IsString()
  locationType?: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export class ReportOptionsDto {
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @IsOptional()
  @IsBoolean()
  includeDetailedData?: boolean;

  @IsOptional()
  @IsString()
  reportTitle?: string;
}

export class GenerateReportDto {
  @IsEnum(['my-analytics', 'location', 'agent', 'collection', 'user', 'comprehensive'], {
    message: 'Invalid report type',
  })
  reportType!: ReportType;

  @IsEnum(['pdf', 'csv'], {
    message: 'Invalid format. Must be pdf or csv',
  })
  format!: ReportFormat;

  @IsOptional()
  @IsObject()
  filters?: ReportFiltersDto;

  @IsOptional()
  @IsObject()
  options?: ReportOptionsDto;
}
