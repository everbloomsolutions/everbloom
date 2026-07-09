/**
 * Application Error Class
 * 
 * Custom error class for application-level errors with HTTP status codes.
 * Includes support for validation errors and error context.
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Array<{ field: string; message: string }>;
  context?: {
    userId?: string;
    requestId?: string;
    operation?: string;
    [key: string]: unknown;
  };

  /**
   * Create a new AppError
   * 
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param context - Optional context object (userId, requestId, operation, etc.)
   */
  constructor(
    message: string,
    statusCode: number = 500,
    context?: {
      userId?: string;
      requestId?: string;
      operation?: string;
      [key: string]: unknown;
    }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}
