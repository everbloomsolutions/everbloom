import { ILogger, LogLevel, LoggerContext } from '../interfaces/logger.interface';

/**
 * Production Logger Strategy
 * 
 * Implements the Strategy Pattern for production environment logging.
 * 
 * Features:
 * - Structured JSON-like output (machine-readable)
 * - Minimal, performance-optimized
 * - Only essential log levels (error, warn, info)
 * - No colors or formatting overhead
 * - Timestamp in ISO format
 * - Context as structured data
 */
export class ProductionLoggerStrategy implements ILogger {
  private readonly minLogLevel: LogLevel;
  private readonly enableDebug: boolean;

  constructor(minLogLevel: LogLevel = LogLevel.INFO, enableDebug: boolean = false) {
    this.minLogLevel = minLogLevel;
    this.enableDebug = enableDebug;
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === LogLevel.DEBUG && !this.enableDebug) {
      return false;
    }
    return level <= this.minLogLevel;
  }

  private formatLogEntry(level: string, message: string, context?: LoggerContext): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };
    return JSON.stringify(entry);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatLogEntry('error', message, context);
    console.error(formatted);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatLogEntry('warn', message, context);
    console.warn(formatted);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatLogEntry('info', message, context);
    console.info(formatted);
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatLogEntry('debug', message, context);
    console.debug(formatted);
  }

  log(message: string, ...args: unknown[]): void {
    // In production, log() maps to info()
    this.info(message, ...args);
  }
}
