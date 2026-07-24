import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { BootstrapService } from './config/runtime/bootstrap.service';
import { SecurityService } from './config/runtime/security.service';
import { MiddlewareService } from './config/runtime/middleware.service';
import { LoggerService } from './infrastructure/logger/logger.service';
import { createLogger } from './infrastructure/logger';
import { configuration } from './config/configuration';

/**
 * Bootstrap Factory
 *
 * Implements the Factory Pattern for application bootstrap.
 * Uses Configuration Services to separate concerns and improve maintainability.
 *
 * Design Patterns Applied:
 * - Factory Pattern: Creates and configures the application
 * - Dependency Injection: Uses NestJS DI for configuration services
 * - Single Responsibility: Each service handles one concern
 * - Separation of Concerns: Security, middleware, and bootstrap config are separated
 */

const config = configuration();
const processLogger = createLogger(
  config.nodeEnv,
  config.logLevel,
  config.enableDebug,
);

process.on('uncaughtException', (err) => {
  processLogger.error('Uncaught exception', {
    message: err.message,
    stack: err.stack,
  });
  // Give console output a moment to flush before exiting so Kubernetes restarts the container.
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  processLogger.error('Unhandled rejection', {
    reason: message,
    stack,
  });
  setTimeout(() => process.exit(1), 100);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get configuration services from DI container
  const bootstrapConfig = app.get(BootstrapService);
  const securityConfig = app.get(SecurityService);
  const middlewareConfig = app.get(MiddlewareService);

  // Apply configurations in order:
  // 1. Security (trust proxy, helmet, HTTPS) - must be first
  securityConfig.configure(app);

  // 2. Middleware (body parsing, compression, sanitization, etc.)
  middlewareConfig.configure(app);

  // 3. Bootstrap (CORS, filters, interceptors, pipes, prefix)
  bootstrapConfig.configure(app);

  // Note: Cloudinary initialization is handled by InitializationService
  // via OnModuleInit lifecycle hook in AppModule

  // CRITICAL: Wait for database connection before starting server
  // This ensures MongoDB is ready before accepting requests
  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');

  try {
    const { DatabaseService } = await import('./infrastructure/database/database.service');
    const databaseService = app.get(DatabaseService);

    // Wait for database connection (onModuleInit should have already run, but verify)
    // If connection is not ready, wait for it
    const connection = databaseService.getConnection();
    const stats = databaseService.getConnectionStats();

    logger.log(`Database connection status: ${stats.readyStateText} (${stats.readyState})`);

    // Use getConnectionStats which returns the readyState as a number
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const currentStats = databaseService.getConnectionStats();
    const readyStateNum = typeof currentStats.readyState === 'number' ? currentStats.readyState : 0;

    if (readyStateNum !== 1) {
      logger.warn('Database connection not ready, waiting...');
      // Wait briefly for the connection; Kubernetes startupProbe will retry the pod if needed.
      const maxWait = configService.get<number>('dbStartupTimeoutMs') || 15000;
      const startTime = Date.now();
      let lastLoggedState = readyStateNum;

      while (true) {
        const currentStats = databaseService.getConnectionStats();
        const currentState = typeof currentStats.readyState === 'number' ? currentStats.readyState : 0;
        const elapsed = Date.now() - startTime;

        if (currentState === 1) {
          break;
        }

        if (elapsed >= maxWait) {
          logger.error(`Database connection not ready after ${maxWait}ms. Final state: ${currentStats.readyStateText}`);
          throw new Error(`Database connection not ready after waiting. State: ${currentStats.readyStateText}`);
        }

        // Log every 5 seconds or on state change
        if (currentState !== lastLoggedState || elapsed % 5000 < 100) {
          logger.log(`Waiting for database... (${elapsed}ms, state: ${currentStats.readyStateText})`);
          lastLoggedState = currentState;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify with ping
      try {
        await connection.db?.admin().ping();
        logger.log('Database connection verified and ping successful');
      } catch (pingError) {
        const errorMsg = pingError instanceof Error ? pingError.message : String(pingError);
        logger.error(`Database ping failed: ${errorMsg}`);
        throw new Error(`Database connection ping failed: ${errorMsg}`);
      }
    } else {
      // Verify with ping even if readyState says connected
      try {
        await connection.db?.admin().ping();
        logger.log('Database connection ready and ping successful');
      } catch (pingError) {
        const errorMsg = pingError instanceof Error ? pingError.message : String(pingError);
        logger.warn(`Database ping failed, connection may not be fully ready: ${errorMsg}`);
        // Don't throw - let it try to connect
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to verify database connection: ${errorMsg}`);
    // Don't start server if database is not ready
    throw error;
  }

  // Containers require binding to 0.0.0.0 and using the injected PORT.
  // If we bind to localhost, the app will start but will not be reachable externally.
  const basePort = config.port || configService.get<number>('port') || 8080;
  const host = config.host || configService.get<string>('host') || '0.0.0.0';
  const maxPortAttempts = 6; // try basePort through basePort+5 on EADDRINUSE

  let boundPort: number | null = null;
  for (let attempt = 0; attempt < maxPortAttempts; attempt++) {
    const tryPort = basePort + attempt;
    try {
      await app.listen(tryPort, host);
      boundPort = tryPort;
      break;
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined;
      if (code === 'EADDRINUSE' && attempt < maxPortAttempts - 1) {
        logger.warn(`Port ${tryPort} in use, trying ${tryPort + 1}...`);
        continue;
      }
      throw err;
    }
  }

  if (boundPort != null) {
    logger.log(`Server running on http://${host}:${boundPort}`);
    logger.log(`Health checks: live=${boundPort}/health/live ready=${boundPort}/health/ready`);
    if (boundPort !== basePort) {
      logger.warn(`Backend bound to port ${boundPort} (${basePort} was in use). Set VITE_BACKEND_PORT=${boundPort} in web-admin if using proxy.`);
    }
  }

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, starting graceful shutdown');
    try {
      await app.close();
      logger.log('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Graceful shutdown failed: ${errorMsg}`);
      process.exit(1);
    }
  });
}

bootstrap();
