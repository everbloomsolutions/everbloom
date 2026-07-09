import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
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
}
