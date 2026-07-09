import { IsEnum, IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { COLLECTION_LOCATION_TYPES } from '../../../types/collections';

export class LocationQueryDto {
  @IsOptional()
  @IsEnum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
  ])
  locationType?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minUsageCount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxUsageCount?: number;

  @IsOptional()
  @IsDateString()
  lastUsedBefore?: string;

  @IsOptional()
  @IsDateString()
  lastUsedAfter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  tags?: string[];

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  assignedToAgent?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unassigned?: boolean;

  @IsOptional()
  @IsEnum(['mostUsed', 'recentlyUsed', 'alphabetical', 'newest'])
  sortBy?: 'mostUsed' | 'recentlyUsed' | 'alphabetical' | 'newest';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
