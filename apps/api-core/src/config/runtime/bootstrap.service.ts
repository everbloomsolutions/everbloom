import { Injectable, Inject } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { formatAllowedOriginsForLog, resolveAllowedOrigins } from '../url-normalization';

/**
 * Bootstrap Service
 *
 * Centralizes application bootstrap configuration following the
 * Configuration Pattern and Single Responsibility Principle.
 *
 * Responsibilities:
 * - Configure global pipes, filters, and interceptors
 * - Set up CORS
 * - Configure global prefix
 */
@Injectable()
export class BootstrapService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(LoggerService) private readonly logger: LoggerService,
  ) {
    this.logger.setContext('BootstrapService');
  }

  /**
   * Configure CORS for the application
   */
  configureCors(app: INestApplication): void {
    const corsOrigin = this.configService.get<string>('corsOrigin');
    const adminPanelUrl = this.configService.get<string>('adminPanelUrl');

    const isDevelopment = this.configService.get<boolean>('isDevelopment') ?? false;
    const devFallback = isDevelopment
      ? 'http://localhost:3001'
      : '';
    const allowedOrigins = resolveAllowedOrigins({
      corsOrigin,
      adminPanelUrl,
      devFallbackOrigin: devFallback,
      defaultProtocol: 'https',
    });

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    });

    this.logger.log('CORS configured', {
      corsOriginConfigured: Boolean(corsOrigin),
      adminPanelUrlConfigured: Boolean(adminPanelUrl),
      allowedOrigins: formatAllowedOriginsForLog(allowedOrigins),
    });
  }

  /**
   * Configure global exception filters
   */
  configureExceptionFilters(app: INestApplication): void {
    app.useGlobalFilters(new HttpExceptionFilter(this.configService));
    this.logger.log('Global exception filters configured');
  }

  /**
   * Configure global interceptors
   */
  configureInterceptors(app: INestApplication): void {
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(this.logger),
    );
    this.logger.log('Global interceptors configured');
  }

  /**
   * Configure global validation pipes
   */
  configureValidationPipes(app: INestApplication): void {
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    this.logger.log('Global validation pipes configured');
  }

  /**
   * Configure global prefix. Root '', health, and debug are excluded so GET /, /health, /debug work (e.g. Vercel).
   */
  configureGlobalPrefix(app: INestApplication): void {
    app.setGlobalPrefix('api/v1', {
      exclude: ['', 'health', 'health/detailed', 'health/cors-test', 'debug'],
    });
    this.logger.log('Global prefix configured: api/v1');
  }

  /**
   * Apply all bootstrap configurations
   */
  configure(app: INestApplication): void {
    this.configureCors(app);
    this.configureExceptionFilters(app);
    this.configureInterceptors(app);
    this.configureValidationPipes(app);
    this.configureGlobalPrefix(app);
  }
}
