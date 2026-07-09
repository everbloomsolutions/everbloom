import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;
}
