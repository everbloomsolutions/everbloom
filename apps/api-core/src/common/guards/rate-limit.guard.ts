import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';

interface AttemptRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  key?: string;
}

/**
 * In-memory rate limiter for NestJS guards.
 *
 * Limits requests by IP within a sliding time window. The map is per-process,
 * so this guard protects a single instance; for horizontal scaling, prefer a
 * distributed store such as Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, AttemptRecord>();

  constructor(
    private readonly options: RateLimitOptions = {
      limit: 5,
      windowMs: 15 * 60 * 1000,
      key: 'login',
    },
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const key = `${this.options.key || 'rate'}:${ip}`;
    const now = Date.now();

    const record = this.attempts.get(key);
    if (!record || record.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + this.options.windowMs,
      });
      return true;
    }

    if (record.count >= this.options.limit) {
      throw new HttpException(
        'Too many attempts. Please try again later.',
        429,
      );
    }

    record.count += 1;
    return true;
  }

  private getClientIp(request: any): string {
    const forwarded = request?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request?.ip || 'unknown';
  }
}

/**
 * Factory for creating a login rate-limit guard.
 *
 * Defaults: 5 attempts per 15 minutes per IP.
 */
export const createRateLimitGuard = (
  limit = 5,
  windowMs = 15 * 60 * 1000,
  key = 'login',
) => new RateLimitGuard({ limit, windowMs, key });
