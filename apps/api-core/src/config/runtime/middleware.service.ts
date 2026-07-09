import { Injectable } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import express from 'express';
import compression from 'compression';
import { REQUEST_LIMITS } from '../constants';
import { isProduction } from '../helpers';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { SanitizeInterceptor } from '../../common/interceptors/sanitize.interceptor';
import { RequestMetadataInterceptor } from '../../common/interceptors/request-metadata.interceptor';
import { SanitizeService } from '../../common/sanitize/sanitize.service';

/**
 * Middleware Service
 * 
 * Implements the Chain of Responsibility Pattern for middleware.
 * Centralizes middleware configuration and ordering.
 * 
 * Responsibilities:
 * - Configure body parsing with size limits
 * - Configure compression middleware
 * - Configure input sanitization
 * - Configure request metadata capture
 * - Configure request logging
 */
@Injectable()
export class MiddlewareService {
  constructor(
    private readonly logger: LoggerService,
    private readonly sanitizeService: SanitizeService,
  ) {
    this.logger.setContext('MiddlewareService');
  }

  /**
   * Configure body parsing with size limits
   */
  configureBodyParsing(expressApp: express.Application): void {
    const REQUEST_SIZE_LIMIT = `${REQUEST_LIMITS.MAX_BODY_SIZE / (1024 * 1024)}mb`;
    expressApp.use(express.json({ limit: REQUEST_SIZE_LIMIT }));
    expressApp.use(express.urlencoded({ extended: true, limit: REQUEST_SIZE_LIMIT }));
    this.logger.log(`Body parsing configured with limit: ${REQUEST_SIZE_LIMIT}`);
  }

  /**
   * Configure compression middleware
   * Compression is platform-level config, handled at Express adapter level
   */
  configureCompression(expressApp: express.Application): void {
    expressApp.use(
      compression({
        // Only compress responses if the request accepts compression
        filter: (req: express.Request, res: express.Response) => {
          if (req.headers['x-no-compression']) {
            // Don't compress responses if this request header is present
            return false;
          }
          // Use compression filter function
          return compression.filter(req, res);
        },
        // Compression level (0-9, where 9 is maximum compression)
        level: isProduction() ? 6 : 1, // Higher compression in production
        // Threshold: only compress responses above this size (in bytes)
        threshold: 1024, // 1KB
      })
    );
    this.logger.log('Compression middleware configured');
  }

  /**
   * Configure input sanitization (via NestJS interceptor)
   */
  configureSanitization(app: INestApplication): void {
    app.useGlobalInterceptors(new SanitizeInterceptor(this.sanitizeService));
    this.logger.log('Input sanitization interceptor configured');
  }

  /**
   * Configure request metadata capture (via NestJS interceptor)
   */
  configureRequestMetadata(app: INestApplication): void {
    app.useGlobalInterceptors(new RequestMetadataInterceptor());
    this.logger.log('Request metadata interceptor configured');
  }

  /**
   * Configure request logging
   * Note: Request logging is handled by LoggingInterceptor in BootstrapService
   * This method is kept for consistency but does nothing (logging is via interceptor)
   */
  configureRequestLogging(_expressApp: express.Application): void {
    // Request logging is handled by LoggingInterceptor in BootstrapService
    // No Express middleware needed
    this.logger.log('Request logging configured via LoggingInterceptor');
  }

  /**
   * Apply all middleware configurations in correct order
   * Order matters: body parsing -> compression -> sanitization (interceptor) -> metadata (interceptor)
   * Note: Logging is handled by LoggingInterceptor in BootstrapService
   */
  configure(app: INestApplication): void {
    const expressApp = app.getHttpAdapter().getInstance();
    
    // Body parsing must come first
    this.configureBodyParsing(expressApp);
    
    // Compression should come early to compress responses
    this.configureCompression(expressApp);
    
    // Sanitization via NestJS interceptor
    this.configureSanitization(app);
    
    // Metadata capture via NestJS interceptor
    this.configureRequestMetadata(app);
    
    // Logging is handled by LoggingInterceptor in BootstrapService
    // (configured after this service in bootstrap order)
  }
}
