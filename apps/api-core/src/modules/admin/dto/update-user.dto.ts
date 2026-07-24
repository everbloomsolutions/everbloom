import { IsString, IsEmail, IsEnum, IsBoolean, IsOptional, IsArray, IsNotEmpty, ArrayMinSize, MinLength, MaxLength, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase())
  @MinLength(5)
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  })
  password?: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(['user', 'agent', 'admin', 'super_admin'])
  role!: 'user' | 'agent' | 'admin' | 'super_admin';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateIf((o) => o.role === 'user')
  @IsNotEmpty({ message: 'Default location is required' })
  @IsString()
  defaultLocationId?: string;

  @ValidateIf((o) => o.role === 'agent')
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one location is required' })
  @IsString({ each: true })
  assignedLocationIds?: string[];
}
