import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard';

const createMockContext = (ip = '127.0.0.1'): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        headers: {},
      }),
    }),
  } as unknown as ExecutionContext);

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(() => {
    guard = new RateLimitGuard({ limit: 3, windowMs: 60_000, key: 'login' });
  });

  it('allows requests within the limit', () => {
    const ctx = createMockContext();
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('blocks requests over the limit', () => {
    const ctx = createMockContext();
    guard.canActivate(ctx);
    guard.canActivate(ctx);
    guard.canActivate(ctx);

    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    try {
      guard.canActivate(ctx);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('resets the counter after the window expires', () => {
    const shortWindowGuard = new RateLimitGuard({ limit: 2, windowMs: 1, key: 'test' });
    const ctx = createMockContext();

    shortWindowGuard.canActivate(ctx);
    shortWindowGuard.canActivate(ctx);

    // Wait for the window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortWindowGuard.canActivate(ctx)).toBe(true);
        resolve();
      }, 10);
    });
  });
});
