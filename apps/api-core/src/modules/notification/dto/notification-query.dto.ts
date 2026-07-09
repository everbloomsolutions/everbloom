import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(['info', 'success', 'warning', 'error', 'inquiry'])
  type?: 'info' | 'success' | 'warning' | 'error' | 'inquiry';
}
