import { IsEnum, IsString, IsOptional, IsArray, IsObject, ValidateNested, MinLength, MaxLength, Matches, IsNumber, Min, Max } from 'class-validator';
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

export class CreateLocationDto {
  @IsEnum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
  ])
  locationType!: string;

  @IsString()
  @MinLength(2, { message: 'Location name must be at least 2 characters' })
  @MaxLength(200, { message: 'Location name must not exceed 200 characters' })
  @Matches(/^[A-Za-z0-9\s\-'.,&()]+$/, {
    message: 'Location name can only contain letters, numbers, spaces, and common punctuation',
  })
  locationName!: string;

  @IsString()
  @MinLength(2, { message: 'Locality must be at least 2 characters' })
  @MaxLength(200, { message: 'Locality must not exceed 200 characters' })
  locality!: string;

  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  @MaxLength(500, { message: 'Address must not exceed 500 characters' })
  address!: string;

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
  @Matches(/^[A-Za-z0-9\s-]+$/, { message: 'Invalid zip code format' })
  zipCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsObject()
  coordinates?: CoordinatesDto;

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

  @IsOptional()
  @IsString()
  assignToUserId?: string;
}
