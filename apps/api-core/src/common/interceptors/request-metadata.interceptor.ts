import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { Request } from 'express';

/**
 * Request Metadata Interceptor
 * Adds requestId and sessionId to request object for tracing
 */
@Injectable()
export class RequestMetadataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate or use existing request ID
    const requestId = request.headers['x-request-id'] || randomUUID();
    request.requestId = requestId;

    // Get or generate session ID
    const sessionId =
      request.headers['x-session-id'] ||
      request.cookies?.sessionId ||
      randomUUID();
    request.sessionId = sessionId;

    // Set response header with request ID for tracing
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}

/**
 * Get request metadata for audit logging
 */
type RequestWithMetadata = Request & { requestId?: string; sessionId?: string };

export function getRequestMetadata(request: RequestWithMetadata): {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
} {
  return {
    ipAddress: request.ip || request.socket?.remoteAddress,
    userAgent: request.get?.('user-agent'),
    requestId: request.requestId,
    sessionId: request.sessionId,
    endpoint: request.originalUrl || request.url,
    method: request.method,
  };
}
