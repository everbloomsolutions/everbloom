import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BootstrapService } from '../src/config/runtime/bootstrap.service';
import { SecurityService } from '../src/config/runtime/security.service';
import { MiddlewareService } from '../src/config/runtime/middleware.service';
import { LoggerService } from '../src/infrastructure/logger/logger.service';

// Set Vercel environment flag
process.env.VERCEL = 'true';

// Validate critical environment variables (no localhost defaults on Vercel)
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const recommendedEnvVars = ['JWT_REFRESH_SECRET', 'ADMIN_PANEL_URL', 'BACKEND_CORS_ORIGIN', 'REDIS_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
const missingRecommended = recommendedEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('[Vercel] ❌ Missing required environment variables:', missingEnvVars);
  console.error('[Vercel] Set them in Vercel Dashboard → Project Settings → Environment Variables');
}
if (missingRecommended.length > 0) {
  console.warn('[Vercel] Recommended env vars not set:', missingRecommended);
}

// Initialize NestJS app once (reused across invocations)
let app: Awaited<ReturnType<typeof NestFactory.create>> | null = null;
let isInitialized = false;

/**
 * Initialize NestJS app and connections
 * This runs once per cold start, then reuses the app instance
 *
 * Note: Socket.io and background jobs are not initialized in serverless environment
 * - Socket.io requires persistent connections (not compatible with serverless)
 * - Background jobs should use Vercel Cron Jobs or external service
 */
async function initializeApp() {
  if (app && isInitialized) {
    return app;
  }

  try {
    console.log('[Vercel] Starting NestJS app initialization...');

    // Create NestJS app
    app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    console.log('[Vercel] NestJS app created, getting services...');

    // Get logger service for initialization messages
    const logger = app.get(LoggerService);
    logger.setContext('Vercel');

    logger.log('Initializing NestJS app (serverless mode)...');

    // Get configuration services from DI container
    const bootstrapConfig = app.get(BootstrapService);
    const securityConfig = app.get(SecurityService);
    const middlewareConfig = app.get(MiddlewareService);

    console.log('[Vercel] Applying configurations...');

    // Apply configurations in order (same as main.ts for consistency)
    securityConfig.configure(app);
    middlewareConfig.configure(app);
    bootstrapConfig.configure(app);

    console.log('[Vercel] Initializing app (app.init())...');

    // Initialize app (but don't listen - Vercel handles that)
    // Note: This will trigger database connection, but we don't wait for it
    // The database will connect asynchronously and be ready when needed
    await app.init();

    console.log('[Vercel] App initialized, checking database connection...');

    // Try to ensure database connection, but don't fail if it's not ready yet
    // In serverless, connections are pooled and may take a moment
    try {
      const { DatabaseService } = await import('../src/infrastructure/database/database.service');
      const databaseService = app.get(DatabaseService);
      const stats = databaseService.getConnectionStats();
      console.log(`[Vercel] Database connection status: ${stats.readyStateText} (${stats.readyState})`);

      // Don't wait for connection - it will connect asynchronously
      // If connection fails, it will be retried on first request
    } catch (dbError) {
      console.warn('[Vercel] Database connection check failed (will retry on first request):', dbError);
      // Don't throw - allow app to continue, database will connect when needed
    }

    isInitialized = true;
    logger.log('NestJS app initialized (Socket.io and background jobs disabled)');
    console.log('[Vercel] ✅ App initialization complete');

    return app;
  } catch (error) {
    // Use console.error for initialization errors (logger might not be available)
    console.error('[Vercel] ❌ Failed to initialize app:', error);
    console.error('[Vercel] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });

    // Reset app state on error
    app = null;
    isInitialized = false;

    throw error;
  }
}

/**
 * Normalize request URL for Express: Vercel rewrites send original path as ?path=...
 * so Express can route correctly (e.g. /health, /api/v1/...).
 */
function normalizeRequestUrl(req: VercelRequest): void {
  const rawUrl = req.url || '/';
  const queryIndex = rawUrl.indexOf('?');
  const search = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
  const params = new URLSearchParams(search);
  const pathParam = params.get('path');
  params.delete('path');
  const restQuery = params.toString();
  const normalizedPath =
    pathParam !== null && pathParam !== undefined && pathParam !== ''
      ? (pathParam.startsWith('/') ? pathParam : `/${pathParam}`)
      : '/';
  req.url = restQuery ? `${normalizedPath}?${restQuery}` : normalizedPath;
}

/**
 * Vercel serverless function handler
 * Wraps NestJS app for Vercel's serverless environment
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    normalizeRequestUrl(req);
    console.log(`[Vercel] ${req.method} ${req.url}`);

    // Initialize app if needed
    const nestApp = await initializeApp();

    // Get Express instance from NestJS
    const expressApp = nestApp.getHttpAdapter().getInstance();

    // Convert Vercel request/response to Express-compatible format
    return new Promise((resolve, reject) => {
      let resolved = false;

      // Handle response end to resolve promise (typed to match VercelResponse.end overloads)
      const originalEnd = res.end.bind(res);
      type Encoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';
      res.end = function (
        chunkOrCb?: unknown,
        encodingOrCb?: Encoding | (() => void),
        cb?: () => void
      ): ReturnType<typeof originalEnd> {
        if (!resolved) {
          resolved = true;
          resolve();
        }
        if (typeof chunkOrCb === 'function') {
          return originalEnd(chunkOrCb as () => void);
        }
        if (typeof encodingOrCb === 'function') {
          return originalEnd(chunkOrCb, encodingOrCb as () => void);
        }
        return originalEnd(chunkOrCb, encodingOrCb as Encoding, cb);
      } as typeof res.end;

      // Handle errors
      res.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          console.error('[Vercel] Response error:', err);
          reject(err);
        }
      });

      // Set timeout to prevent hanging (60s max duration)
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[Vercel] Request timeout');
          if (!res.headersSent) {
            res.status(504).json({
              success: false,
              message: 'Request timeout',
            });
          }
          resolve();
        }
      }, 55000); // 55s to allow some buffer before 60s max

      // Process request through Express app
      expressApp(req as Parameters<typeof expressApp>[0], res as Parameters<typeof expressApp>[1], (err?: unknown) => {
        clearTimeout(timeout);
        if (err) {
          console.error('[Vercel] NestJS error:', err);
          if (!resolved) {
            resolved = true;
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? String(err) : undefined,
              });
            }
            resolve();
          }
        }
      });
    });
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    console.error('[Vercel] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });

    // Ensure response is sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      });
    }
  }
}
