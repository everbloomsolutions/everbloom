import { ILogger } from './interfaces/logger.interface';
import { DevelopmentLoggerStrategy } from './strategies/development-logger.strategy';
import { ProductionLoggerStrategy } from './strategies/production-logger.strategy';
import { LogLevel } from './interfaces/logger.interface';

/**
 * Logger Factory
 * 
 * Implements the Factory Pattern to create appropriate logger instances
 * based on the environment.
 * 
 * Design Pattern: Factory Pattern
 * - Creates logger instances without exposing instantiation logic
 * - Encapsulates environment detection
 * - Provides consistent interface regardless of implementation
 */
export class LoggerFactory {
  /**
   * Create logger instance based on environment
   * 
   * @param nodeEnv - Node environment (development, production, test)
   * @param logLevel - Minimum log level (optional, defaults based on environment)
   * @param enableDebug - Enable debug logs in production (optional, default: false)
   * @returns Logger instance
   */
  static create(
    nodeEnv: string = 'development',
    logLevel?: string,
    enableDebug: boolean = false,
  ): ILogger {
    const isDevelopment = nodeEnv === 'development' || !nodeEnv;
    const isProduction = nodeEnv === 'production';

    if (isDevelopment) {
      return new DevelopmentLoggerStrategy();
    }

    if (isProduction) {
      // Parse log level from environment or parameter
      const minLevel = logLevel
        ? this.parseLogLevel(logLevel)
        : LogLevel.INFO; // Default to INFO in production

      return new ProductionLoggerStrategy(minLevel, enableDebug);
    }

    // For test or other environments, use development logger
    return new DevelopmentLoggerStrategy();
  }

  /**
   * Parse log level string to LogLevel enum
   */
  private static parseLogLevel(level: string): LogLevel {
    const normalized = level.toLowerCase().trim();
    
    switch (normalized) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      case 'verbose':
        return LogLevel.VERBOSE;
      default:
        return LogLevel.INFO;
    }
  }
}
