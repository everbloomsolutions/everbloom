import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Inject,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  parseCookies,
  serializeCookie,
} from '../../common/utils/cookie.util';

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private getTokenExpiry(token: string): number {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        return decoded.exp * 1000;
      }
    } catch {
      // fall through to default
    }
    return Date.now() + 900_000; // 15 minutes default
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    const result = await this.authService.registerUser(registerUserDto);
    return {
      success: true,
      data: result,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  @UseGuards(new RateLimitGuard({ limit: 5, windowMs: 15 * 60 * 1000, key: 'login' }))
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginUser(loginDto);

    res.setHeader(
      'Set-Cookie',
      [
        serializeCookie(ACCESS_TOKEN_COOKIE, result.token, {
          httpOnly: true,
          secure: this.isProduction,
          sameSite: 'Strict',
          maxAge: 900, // 15 minutes
          path: '/',
        }),
        serializeCookie(REFRESH_TOKEN_COOKIE, result.refreshToken ?? '', {
          httpOnly: true,
          secure: this.isProduction,
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
        }),
      ],
    );

    return {
      success: true,
      data: { user: result.user, tokenExpiry: this.getTokenExpiry(result.token) },
      message: 'Login successful',
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@CurrentUser() user: UserDocument) {
    const userData = await this.authService.getCurrentUser(user._id.toString());
    return {
      success: true,
      data: { user: userData },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken =
      cookies[REFRESH_TOKEN_COOKIE] ||
      refreshTokenDto.refreshToken ||
      '';

    const result = await this.authService.refreshAccessToken(refreshToken);

    res.setHeader(
      'Set-Cookie',
      [
        serializeCookie(ACCESS_TOKEN_COOKIE, result.token, {
          httpOnly: true,
          secure: this.isProduction,
          sameSite: 'Strict',
          maxAge: 900,
          path: '/',
        }),
        serializeCookie(REFRESH_TOKEN_COOKIE, result.refreshToken ?? '', {
          httpOnly: true,
          secure: this.isProduction,
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        }),
      ],
    );

    return {
      success: true,
      data: { tokenExpiry: this.getTokenExpiry(result.token) },
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[ACCESS_TOKEN_COOKIE];
    if (token) {
      await this.authService.blacklistToken(token);
    }

    res.setHeader(
      'Set-Cookie',
      [
        serializeCookie(ACCESS_TOKEN_COOKIE, '', { httpOnly: true, secure: this.isProduction, sameSite: 'Strict', maxAge: 0, path: '/' }),
        serializeCookie(REFRESH_TOKEN_COOKIE, '', { httpOnly: true, secure: this.isProduction, sameSite: 'Strict', maxAge: 0, path: '/' }),
      ],
    );

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Post('forgot-password')
  @UseGuards(new RateLimitGuard({ limit: 5, windowMs: 15 * 60 * 1000, key: 'forgot-password' }))
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return {
      success: true,
      message: 'Password reset successful',
    };
  }
}
