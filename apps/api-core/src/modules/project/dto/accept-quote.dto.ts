import { IsString, IsOptional, MaxLength } from 'class-validator';

export class AcceptQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
