import { Injectable, Inject } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { LoggerService } from '../../infrastructure/logger/logger.service';

/**
 * Security Service
 * 
 * Implements the Strategy Pattern for security configuration.
 * Separates security concerns from bootstrap logic.
 * 
 * Responsibilities:
 * - Configure security headers (Helmet)
 * - Enforce HTTPS in production
 * - Configure trust proxy settings
 */
@Injectable()
export class SecurityService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(LoggerService) private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SecurityService');
  }

  /**
   * Configure trust proxy settings
   * Important for IP detection behind reverse proxy
   */
  configureTrustProxy(expressApp: express.Application): void {
    expressApp.set('trust proxy', 1);
    this.logger.log('Trust proxy configured');
  }

  /**
   * Configure security headers using Helmet
   */
  configureSecurityHeaders(expressApp: express.Application): void {
    const isProduction = this.configService.get<boolean>('isProduction') ?? false;
    expressApp.use(helmet({
      contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for easier debugging
      crossOriginEmbedderPolicy: false, // Disable for OAuth compatibility
    }));
    this.logger.log('Security headers configured (Helmet)');
  }

  /**
   * Configure HTTPS enforcement in production
   * Implements redirect strategy for non-HTTPS requests
   */
  configureHttpsEnforcement(expressApp: express.Application): void {
    const isProduction = this.configService.get<boolean>('isProduction') ?? false;
    if (!isProduction) {
      return;
    }

    expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Skip HTTPS redirect for OPTIONS requests (CORS preflight)
      if (req.method === 'OPTIONS') {
        return next();
      }

      // Skip HTTPS redirect for WebSocket upgrade requests (e.g., Socket.IO)
      // Redirecting an upgrade request will break the websocket handshake.
      if (String(req.headers.upgrade || '').toLowerCase() === 'websocket') {
        return next();
      }

      // Skip HTTPS redirect for health checks so Kubernetes/ALB probes work on HTTP port
      if (req.path === '/health' || req.path.startsWith('/health/')) {
        return next();
      }

      // Skip HTTPS redirect for ACME challenge paths
      if (req.path.startsWith('/.well-known/acme-challenge/')) {
        return next();
      }
      
      if (req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(301, `https://${req.header('host')}${req.url}`);
      }
      // Add HSTS header
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      next();
    });

    this.logger.log('HTTPS enforcement configured for production');
  }

  /**
   * Apply all security configurations
   */
  configure(app: INestApplication): void {
    const expressApp = app.getHttpAdapter().getInstance();
    this.configureTrustProxy(expressApp);
    this.configureSecurityHeaders(expressApp);
    this.configureHttpsEnforcement(expressApp);
  }
}
