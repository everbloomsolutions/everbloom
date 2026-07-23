import { Controller, Get, Req, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { LoggerService } from '../../infrastructure/logger/logger.service';

@Controller()
export class RootController {
  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.logger.setContext('RootController');
  }

  @Get()
  getRoot() {
    return {
      success: true,
      message: 'Welcome to the Ever Blooming Recycling Solutions API',
    };
  }

  @Get('test')
  getTest(@Req() req: Request) {
    this.logger.log('Test endpoint called', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
    });
    return {
      success: true,
      message: 'Server is reachable',
      timestamp: new Date().toISOString(),
      origin: req.headers.origin,
    };
  }

  /**
   * Debug endpoint (Vercel): request path, url, method, env for troubleshooting.
   * Excluded from global prefix so GET /debug works.
   */
  @Get('debug')
  getDebug(@Req() req: Request) {
    return {
      success: true,
      message: 'Debug info (Vercel)',
      timestamp: new Date().toISOString(),
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        originalUrl: (req as Request & { originalUrl?: string }).originalUrl,
      },
      env: {
        VERCEL: this.configService.get<boolean>('isVercel') ?? false,
        NODE_ENV: this.configService.get<string>('nodeEnv'),
      },
    };
  }
}
