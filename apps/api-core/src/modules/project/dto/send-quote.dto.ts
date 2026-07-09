import { IsNumber, IsString, IsOptional, Min, MinLength, MaxLength } from 'class-validator';

export class SendQuoteDto {
  @IsNumber()
  @Min(0, { message: 'Quote amount must be positive' })
  quoteAmount!: number;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Quote details are required' })
  @MaxLength(2000)
  quoteDetails?: string;

  @IsOptional()
  @IsString()
  estimatedTimeline?: string;
}
