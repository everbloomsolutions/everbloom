/**
 * Logger Module Exports
 * 
 * Central export point for logger functionality.
 * Provides both the service and factory for different use cases.
 */

// Services
export { LoggerService } from './logger.service';
export { LoggerModule } from './logger.module';

// Factory
export { LoggerFactory } from './logger.factory';

// Strategies
export { DevelopmentLoggerStrategy } from './strategies/development-logger.strategy';
export { ProductionLoggerStrategy } from './strategies/production-logger.strategy';

// Interfaces and Types
export type { ILogger, LoggerContext } from './interfaces/logger.interface';
export { LogLevel } from './interfaces/logger.interface';

// Convenience function for non-NestJS contexts
import { LoggerFactory } from './logger.factory';

/**
 * Create a logger instance (for use outside NestJS DI)
 * 
 * @example
 * ```typescript
 * import { createLogger } from './common/logger';
 * const logger = createLogger();
 * logger.info('Application started');
 * ```
 */
export const createLogger = (
  nodeEnv?: string,
  logLevel?: string,
  enableDebug?: boolean,
) => {
  return LoggerFactory.create(nodeEnv, logLevel, enableDebug);
};
