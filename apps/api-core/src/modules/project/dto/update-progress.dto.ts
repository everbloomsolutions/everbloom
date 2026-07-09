import { IsNumber, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
