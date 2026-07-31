import { IsString, MinLength, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken?: string;
}
