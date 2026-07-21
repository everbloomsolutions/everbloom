import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType } from 'redis';
import { RedisService } from './redis.service';
import { LoggerService } from '../logger/logger.service';

export type BullRedisConnection = string | {
  redis: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls?: Record<string, unknown>;
    connectTimeout?: number;
    lazyConnect?: boolean;
  };
} | null;

export function getBullRedisConnectionFromUrl(rawUrl: string): BullRedisConnection {
  const redisUrl = rawUrl.trim();
  if (!redisUrl) {
    return null;
  }

  const isUpstash = redisUrl.includes('upstash.io') || redisUrl.includes('upstash.com');
  const isTls = redisUrl.startsWith('rediss://');

  if (isUpstash || isTls) {
    try {
      const url = new URL(redisUrl);
      const host = url.hostname;
      const port = parseInt(url.port || (isTls ? '6380' : '6379'), 10);

      let password: string | undefined;
      if (url.password) {
        password = url.password;
      } else if (url.username && url.username !== 'default' && url.username !== '') {
        password = url.username;
      }

      return {
        redis: {
          host,
          port,
          username: url.username || 'default',
          password: password ? decodeURIComponent(password) : undefined,
          tls: {},
          connectTimeout: 10000,
          lazyConnect: false,
        },
      };
    } catch {
      return redisUrl;
    }
  }

  return redisUrl;
}

/**
 * Redis Helper Service
 *
 * Provides helper functions for Bull queues and other Redis operations.
 * Wraps RedisService to provide compatibility with legacy code.
 */
@Injectable()
export class RedisHelperService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType | null,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) { }

  /**
   * Get the Redis client instance
   */
  getRedisClient(): RedisClientType | null {
    return this.redisClient;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.redisService.isConnected();
  }

  /**
   * Get Bull-compatible Redis connection options, or null when Redis is not configured.
   * Bull v4 uses ioredis, which needs explicit TLS configuration for rediss:// URLs.
   */
  getBullRedisConnection(): BullRedisConnection {
    const raw = this.configService.get<string>('redisUrl');
    const redisUrl = typeof raw === 'string' ? raw.trim() : '';
    if (!redisUrl) {
      return null;
    }
    const conn = getBullRedisConnectionFromUrl(redisUrl);
    if (conn && typeof conn === 'object') {
      this.logger.log(`Configuring Bull queue with Upstash/TLS Redis: ${conn.redis.host}:${conn.redis.port} (TLS enabled)`);
    }
    return conn;
  }
}
