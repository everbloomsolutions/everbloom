import { IsString, IsEmail, IsEnum, IsBoolean, IsOptional, IsArray, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase())
  @MinLength(5)
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  })
  password?: string;

  @IsOptional()
  @IsEnum(['user', 'agent', 'admin', 'super_admin'])
  role?: 'user' | 'agent' | 'admin' | 'super_admin';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  defaultLocationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedLocationIds?: string[];
}
