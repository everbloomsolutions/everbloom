import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ContactDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name is too long' })
  name!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters' })
  @MaxLength(2000, { message: 'Message is too long' })
  message!: string;
}
