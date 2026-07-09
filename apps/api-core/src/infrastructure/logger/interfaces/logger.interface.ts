/**
 * Logger Interface
 * 
 * Defines the contract for all logger implementations.
 * Follows the Interface Segregation Principle.
 */
export interface ILogger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  log(message: string, ...args: unknown[]): void;
}

/**
 * Log Level Enum
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

/**
 * Logger Context
 * Additional metadata for structured logging
 */
export interface LoggerContext {
  [key: string]: unknown;
}
