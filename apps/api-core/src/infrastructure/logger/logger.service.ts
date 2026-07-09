import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILogger } from './interfaces/logger.interface';
import { LoggerFactory } from './logger.factory';

/**
 * Logger Service
 * 
 * Implements NestJS LoggerService interface for dependency injection.
 * Uses Strategy Pattern internally to switch between development and production loggers.
 * 
 * Design Patterns:
 * - Strategy Pattern: Different logging strategies for different environments
 * - Adapter Pattern: Adapts custom logger to NestJS LoggerService interface
 * - Dependency Injection: Injectable service for use throughout the application
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly logger: LoggerService) {}
 * 
 * this.logger.log('Application started');
 * this.logger.error('Error occurred', { error: err });
 * ```
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: ILogger;
  private context?: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const nodeEnv = this.configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development';
    const logLevel = this.configService.get<string>('logLevel') || process.env.LOG_LEVEL;
    const enableDebug = this.configService.get<boolean>('enableDebug') || 
                       process.env.ENABLE_DEBUG === 'true';

    this.logger = LoggerFactory.create(nodeEnv, logLevel, enableDebug);
  }

  /**
   * Set context for this logger instance
   * Call this method to add context to all log messages from this instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log message (maps to info in production)
   */
  log(message: string, ...args: unknown[]): void {
    const context = this.context ? { context: this.context, ...this.extractContext(args) } : this.extractContext(args);
    this.logger.log(message, context, ...this.getRemainingArgs(args));
  }

  /**
   * Log error message
   */
  error(message: string, trace?: string, context?: string): void {
    const logContext: Record<string, unknown> = {};
    if (this.context) logContext.context = this.context;
    if (context) logContext.customContext = context;
    if (trace) logContext.trace = trace;
    
    this.logger.error(message, logContext);
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    const logContext = this.context ? { context: this.context, ...this.extractContext(args) } : this.extractContext(args);
    this.logger.warn(message, logContext, ...this.getRemainingArgs(args));
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    const logContext = this.context ? { context: this.context, ...this.extractContext(args) } : this.extractContext(args);
    this.logger.debug(message, logContext, ...this.getRemainingArgs(args));
  }

  /**
   * Log verbose message (maps to debug)
   */
  verbose(message: string, ...args: unknown[]): void {
    this.debug(message, ...args);
  }

  /**
   * Extract context object from args if present
   */
  private extractContext(args: unknown[]): Record<string, unknown> | undefined {
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      return args[0] as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * Get remaining args after extracting context
   */
  private getRemainingArgs(args: unknown[]): unknown[] {
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      return args.slice(1);
    }
    return args;
  }
}
