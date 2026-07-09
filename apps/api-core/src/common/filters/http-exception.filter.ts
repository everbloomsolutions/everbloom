import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal Server Error';

    const req = request as Request & { id?: string };
    const requestId =
      req.id ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const msgObj = typeof message === 'object' && message !== null ? message as { message?: string | string[] } : null;
    const errorResponse: { success: false; message: string; requestId: string; errors?: { message: string }[]; stack?: string } = {
      success: false,
      message: typeof message === 'string' ? message : (msgObj?.message && typeof msgObj.message === 'string' ? msgObj.message : 'Error'),
      requestId,
    };

    // Include validation errors if present
    if (
      exception instanceof HttpException &&
      msgObj?.message &&
      Array.isArray(msgObj.message)
    ) {
      errorResponse.errors = msgObj.message.map((msg: string) => ({
        message: msg,
      }));
    }

    // Include stack trace in development only
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
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
