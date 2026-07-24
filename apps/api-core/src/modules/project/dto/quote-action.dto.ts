import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QuoteActionDto {
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  @MaxLength(2000, { message: 'notes must not exceed 2000 characters' })
  notes?: string;
}
