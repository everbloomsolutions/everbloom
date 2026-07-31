import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UserQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['user', 'agent', 'admin', 'super_admin'])
  role?: 'user' | 'agent' | 'admin' | 'super_admin';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj, key }) => {
    const raw = obj ? (obj as any)[key] : value;
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (raw === 'true' || raw === true || raw === 1 || raw === '1') return true;
    if (raw === 'false' || raw === false || raw === 0 || raw === '0') return false;
    return undefined;
  })
  isActive?: boolean;
}
