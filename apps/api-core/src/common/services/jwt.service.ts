import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { configuration } from '../../config/configuration';

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtService {
  constructor(
    @Optional() @Inject(ConfigService) private configService?: ConfigService,
  ) { }

  generateToken(payload: TokenPayload): string {
    const secret = this.configService?.get<string>('jwtSecret') ?? configuration().jwtSecret;
    const expiresIn = this.configService?.get<string>('jwtExpiresIn') ?? configuration().jwtExpiresIn;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  generateRefreshToken(payload: TokenPayload): string {
    const secret = this.configService?.get<string>('jwtRefreshSecret') ?? configuration().jwtRefreshSecret;
    const expiresIn = this.configService?.get<string>('jwtRefreshExpiresIn') ?? configuration().jwtRefreshExpiresIn;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  verifyToken(token: string, type: TokenType = 'access'): TokenPayload {
    const secret =
      type === 'refresh'
        ? (this.configService?.get<string>('jwtRefreshSecret') ?? configuration().jwtRefreshSecret)
        : (this.configService?.get<string>('jwtSecret') ?? configuration().jwtSecret);
    if (!secret) {
      throw new Error(
        type === 'refresh'
          ? 'JWT_REFRESH_SECRET is not configured'
          : 'JWT_SECRET is not configured',
      );
    }
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string' || !decoded) {
      throw new Error('Invalid token payload');
    }
    return decoded as TokenPayload;
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verifyToken(token, 'access');
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verifyToken(token, 'refresh');
  }

  generateTokens(
    userId: string,
    email?: string,
    role?: string,
  ): { token: string; refreshToken: string } {
    const payload: TokenPayload = {
      userId,
      email: email ?? '',
      role: role ?? 'user',
    };
    return {
      token: this.generateToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}

