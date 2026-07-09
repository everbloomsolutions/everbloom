import { IsEnum, IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType, AuditAction } from '../schemas/audit-log.schema';

export class AuditLogQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(['project', 'receipt', 'user', 'location', 'contact', 'other'])
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum([
    'created',
    'updated',
    'deleted',
    'receipt_generated',
    'transferred',
    'quote_sent',
    'quote_accepted',
    'quote_rejected',
    'project_started',
    'project_completed',
    'progress_updated',
    'user_created',
    'user_updated',
    'user_deleted',
    'login',
    'logout',
    'other',
  ])
  action?: AuditAction;

  @IsOptional()
  @IsString()
  performedBy?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class AuditLogStatsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['project', 'receipt', 'user', 'location', 'contact', 'other'])
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  enhanced?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}
