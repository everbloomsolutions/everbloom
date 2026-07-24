import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchLocationDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasDefaultUser?: boolean;
}
