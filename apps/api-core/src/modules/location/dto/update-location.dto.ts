import { IsEnum, IsString, IsOptional, IsArray, IsObject, ValidateNested, MinLength, MaxLength, Matches, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { COLLECTION_LOCATION_TYPES } from '../../../types/collections';

class CoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class UpdateLocationDto {
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
  @MinLength(2)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9\s\-'.,&()]+$/)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  locality?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9\s-]+$/)
  zipCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsObject()
  coordinates?: CoordinatesDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
