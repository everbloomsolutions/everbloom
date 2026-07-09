import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SanitizeService } from '../sanitize/sanitize.service';

/**
 * Sanitize Interceptor
 * Sanitizes request body, query, and params to prevent XSS attacks
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  constructor(private sanitizeService: SanitizeService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitizeService.sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      const sanitizedQuery: Record<string, unknown> = {};
      for (const key in request.query) {
        const value = request.query[key];
        if (typeof value === 'string') {
          sanitizedQuery[key] = this.sanitizeService.sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitizedQuery[key] = value.map((item) =>
            typeof item === 'string' ? this.sanitizeService.sanitizeString(item) : item
          );
        } else {
          sanitizedQuery[key] = value;
        }
      }
      request.query = sanitizedQuery;
    }

    // Sanitize URL parameters
    if (request.params && typeof request.params === 'object') {
      const sanitizedParams: Record<string, string> = {};
      for (const key in request.params) {
        sanitizedParams[key] = this.sanitizeService.sanitizeString(request.params[key]);
      }
      request.params = sanitizedParams;
    }

    return next.handle();
  }
}
