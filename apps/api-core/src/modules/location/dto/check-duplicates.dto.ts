import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { COLLECTION_LOCATION_TYPES, CollectionLocationType } from '../../../types/collections';

export class CheckDuplicatesDto {
  @IsOptional()
  @IsNumber({}, { message: 'threshold must be a number' })
  threshold?: number;

  @IsOptional()
  @IsEnum(Object.values(COLLECTION_LOCATION_TYPES) as CollectionLocationType[], {
    message: 'Invalid locationType',
  })
  locationType?: CollectionLocationType;

  @IsOptional()
  @IsString({ message: 'locationName must be a string' })
  locationName?: string;

  @IsOptional()
  @IsString({ message: 'address must be a string' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'locality must be a string' })
  locality?: string;

  @IsOptional()
  @IsString({ message: 'city must be a string' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'state must be a string' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'zipCode must be a string' })
  zipCode?: string;
}
