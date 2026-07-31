import { IsString, IsOptional, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class UpdateOnboardingProfileDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Phone number must contain 10 to 15 digits' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  company?: string;
}
