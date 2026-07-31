import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppError } from '../exceptions/app-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof AppError) {
      status = exception.statusCode;
      message = exception.message;
    }

    const req = request as Request & { id?: string };
    const requestId =
      req.id ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const msgObj = typeof message === 'object' && message !== null ? message as { message?: string | string[]; data?: unknown } : null;
    const errorResponse: { success: false; message: string; requestId: string; errors?: { message: string }[]; data?: unknown; stack?: string } = {
      success: false,
      message: typeof message === 'string' ? message : (msgObj?.message && typeof msgObj.message === 'string' ? msgObj.message : 'Error'),
      requestId,
    };

    if (msgObj?.data !== undefined) {
      errorResponse.data = msgObj.data;
    }

    // Include validation errors if present
    if (
      exception instanceof HttpException &&
      msgObj?.message &&
      Array.isArray(msgObj.message)
    ) {
      errorResponse.errors = msgObj.message.map((msg: string) => ({
        message: msg,
      }));
    } else if (exception instanceof AppError && exception.errors) {
      errorResponse.errors = exception.errors;
    }

    // Include stack trace in development only
    const isDevelopment = this.configService.get<boolean>('isDevelopment') ?? false;
    if (isDevelopment && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log error
    if (status >= 500) {
      this.logger.error(
        `Server error: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : '',
        {
          requestId,
          method: request.method,
          path: request.path,
          statusCode: status,
        },
      );
    } else if (status >= 400) {
      this.logger.warn(`Client error: ${errorResponse.message}`, {
        requestId,
        method: request.method,
        path: request.path,
        statusCode: status,
      });
    }

    response.status(status).json(errorResponse);
  }
}
