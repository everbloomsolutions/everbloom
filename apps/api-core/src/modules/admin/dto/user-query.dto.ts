import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['user', 'agent', 'admin', 'super_admin'])
  role?: 'user' | 'agent' | 'admin' | 'super_admin';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
