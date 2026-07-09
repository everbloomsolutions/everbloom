import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  })
  newPassword!: string;

  @IsString()
  @MinLength(1, { message: 'Password confirmation is required' })
  confirmPassword!: string;
}
