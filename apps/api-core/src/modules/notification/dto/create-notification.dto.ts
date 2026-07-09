import { IsString, IsEnum, IsOptional, IsUrl, IsObject, MinLength, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MinLength(1, { message: 'User ID is required' })
  userId!: string;

  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @IsString()
  @MinLength(1, { message: 'Message is required' })
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message!: string;

  @IsOptional()
  @IsEnum(['info', 'success', 'warning', 'error', 'inquiry'])
  type?: 'info' | 'success' | 'warning' | 'error' | 'inquiry';

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL' })
  link?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
