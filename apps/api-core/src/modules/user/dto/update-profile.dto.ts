import { IsString, IsEmail, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;
}
