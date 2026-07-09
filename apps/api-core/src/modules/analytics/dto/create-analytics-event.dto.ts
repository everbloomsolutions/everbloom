import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';

export class CreateAnalyticsEventDto {
  @IsString()
  @MinLength(1, { message: 'Event type is required' })
  eventType!: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
