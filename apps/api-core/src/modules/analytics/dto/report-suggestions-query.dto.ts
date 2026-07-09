import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ReportType } from '../analytics-report.types';

export class ReportSuggestionsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['my-analytics', 'location', 'agent', 'collection', 'user', 'comprehensive'])
  reportType?: ReportType;
}
