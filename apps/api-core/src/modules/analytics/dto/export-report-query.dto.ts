import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class ExportReportQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  locationType?: string;

  @IsOptional()
  @IsString()
  granularity?: 'daily' | 'weekly' | 'monthly';

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
