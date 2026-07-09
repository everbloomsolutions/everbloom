import { ILogger, LoggerContext } from '../interfaces/logger.interface';

/**
 * Development Logger Strategy
 * 
 * Implements the Strategy Pattern for development environment logging.
 * 
 * Features:
 * - Pretty, colored console output
 * - Detailed stack traces
 * - Human-readable timestamps
 * - All log levels enabled
 * - Context formatting for readability
 */
export class DevelopmentLoggerStrategy implements ILogger {
  private readonly colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[35m', // Magenta
    log: '\x1b[37m',   // White
    reset: '\x1b[0m',
    dim: '\x1b[2m',
  };

  private formatTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  private formatContext(context?: LoggerContext): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    return ` ${this.colors.dim}${JSON.stringify(context, null, 2)}${this.colors.reset}`;
  }

  private formatMessage(level: string, message: string, context?: LoggerContext): string {
    const timestamp = this.formatTimestamp();
    const color = this.colors[level as keyof typeof this.colors] || this.colors.reset;
    const contextStr = this.formatContext(context);
    return `${this.colors.dim}[${timestamp}]${this.colors.reset} ${color}[${level.toUpperCase()}]${this.colors.reset} ${message}${contextStr}`;
  }

  error(message: string, ...args: unknown[]): void {
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatMessage('error', message, context);
    console.error(formatted, ...(context ? args.slice(1) : args));
  }

  warn(message: string, ...args: unknown[]): void {
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted, ...(context ? args.slice(1) : args));
  }

  info(message: string, ...args: unknown[]): void {
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatMessage('info', message, context);
    console.info(formatted, ...(context ? args.slice(1) : args));
  }

  debug(message: string, ...args: unknown[]): void {
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatMessage('debug', message, context);
    console.debug(formatted, ...(context ? args.slice(1) : args));
  }

  log(message: string, ...args: unknown[]): void {
    const context = args.length > 0 && typeof args[0] === 'object' && args[0] !== null
      ? args[0] as LoggerContext
      : undefined;
    const formatted = this.formatMessage('log', message, context);
    console.log(formatted, ...(context ? args.slice(1) : args));
  }
}
