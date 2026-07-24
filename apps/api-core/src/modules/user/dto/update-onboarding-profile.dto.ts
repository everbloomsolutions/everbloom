import { IsString, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateOnboardingProfileDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  company?: string;
}
