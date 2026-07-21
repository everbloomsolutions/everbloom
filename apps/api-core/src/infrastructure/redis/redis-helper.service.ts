import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType } from 'redis';
import { RedisService } from './redis.service';
import { LoggerService } from '../logger/logger.service';

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
  getBullRedisConnection(): string | {
    redis: {
      host: string;
      port: number;
      password?: string;
      tls?: Record<string, unknown>;
      connectTimeout?: number;
      lazyConnect?: boolean;
    };
  } | null {
    const raw = this.configService.get<string>('redisUrl');
    const redisUrl = typeof raw === 'string' ? raw.trim() : '';
    if (!redisUrl) {
      return null;
    }

    // Detect Upstash by domain
    const isUpstash = redisUrl.includes('upstash.io') || redisUrl.includes('upstash.com');
    const isTls = redisUrl.startsWith('rediss://');

    // For Upstash or TLS connections, parse URL and return object config
    if (isUpstash || isTls) {
      try {
        // Parse Redis URL: rediss://:password@host:port or redis://:password@host:port
        // Upstash format: rediss://default:PASSWORD@HOST:PORT
        const url = new URL(redisUrl);
        const host = url.hostname;
        // Default ports: 6380 for TLS, 6379 for non-TLS
        const port = parseInt(url.port || (isTls ? '6380' : '6379'), 10);

        // Extract password from URL
        // Password can be in: url.password (after : and before @) or url.username if no password field
        let password: string | undefined;
        if (url.password) {
          password = url.password;
        } else if (url.username && url.username !== 'default' && url.username !== '') {
          // Some Upstash URLs might have password as username
          password = url.username;
        }

        // Log connection details (without password) for debugging
        this.logger.log(`Configuring Bull queue with Upstash/TLS Redis: ${host}:${port} (TLS enabled)`);

        // Return object config with redis property for Bull
        return {
          redis: {
            host,
            port,
            username: url.username || 'default',
            password: decodeURIComponent(password),
            tls: {}, // Empty object enables TLS with default settings for ioredis
            connectTimeout: 10000, // 10 seconds timeout
            lazyConnect: false, // Connect immediately
          },
        };
      } catch (error) {
        this.logger.warn('Failed to parse Redis URL for Bull connection, using URL string:', error);
        // Fallback to URL string if parsing fails
        return redisUrl;
      }
    }

    // For non-TLS connections, return URL string (ioredis can handle this)
    return redisUrl;
  }
}
