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
} from 'class-validator';
import { Type } from 'class-transformer';
import { COLLECTION_LOCATION_TYPES, MATERIAL_TYPE_ENUM } from '../../../types/collections';

class LocationDto {
  @IsString()
  @MinLength(5)
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
  @Min(0.1)
  weight!: number;

  @IsNumber()
  @Min(0)
  rate!: number;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsEnum(['pending', 'quoted', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsEnum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
  ])
  locationType?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  locationName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionItemDto)
  @MinLength(1)
  collectionItems?: CollectionItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @IsOptional()
  @IsDateString()
  collectionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quoteAmount?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  quoteDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  estimatedTimeline?: string;
}
