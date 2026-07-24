import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { COLLECTION_LOCATION_TYPES, MATERIAL_TYPE_ENUM } from '../../../types/collections';

class LocationDto {
  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  address!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

class CollectionItemDto {
  @IsEnum(MATERIAL_TYPE_ENUM)
  materialType!: string;

  @IsNumber()
  @Min(0.1, { message: 'Weight must be at least 0.1 kg' })
  weight!: number;

  @IsNumber()
  @Min(0, { message: 'Rate must be positive' })
  rate!: number;
}

export class CreateProjectDto {
  @IsEnum(['recycling', 'cctv', 'access-control', 'fire-safety', 'networking', 'home-automation', 'other'])
  serviceType!: string;

  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters' })
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(5, { message: 'Description must be at least 5 characters' })
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

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
  @MinLength(2, { message: 'Location name must be at least 2 characters' })
  @MaxLength(200, { message: 'Location name must not exceed 200 characters' })
  locationName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionItemDto)
  @MinLength(1, { message: 'At least one collection item is required' })
  collectionItems?: CollectionItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @IsOptional()
  @IsDateString()
  collectionDate?: string;
}
