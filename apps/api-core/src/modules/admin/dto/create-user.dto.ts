import { IsString, IsEmail, IsEnum, IsBoolean, IsOptional, IsArray, MinLength, MaxLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase())
  @MinLength(5, { message: 'Email must be at least 5 characters' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password!: string;

  @IsOptional()
  @IsEnum(['user', 'agent', 'admin', 'super_admin'], {
    message: 'Role must be one of: user, agent, admin, or super_admin',
  })
  role?: 'user' | 'agent' | 'admin' | 'super_admin';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateIf((o) => o.role === 'user')
  @IsString()
  defaultLocationId?: string;

  @ValidateIf((o) => o.role === 'agent')
  @IsArray()
  @IsString({ each: true })
  assignedLocationIds?: string[];
}
