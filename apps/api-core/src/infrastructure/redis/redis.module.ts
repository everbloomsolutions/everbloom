import { Module, Global, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { configuration } from '../../config/configuration';
import { RedisService } from './redis.service';
import { RedisHelperService } from './redis-helper.service';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (): Promise<RedisClientType | null> => {
        const logger = new Logger('RedisModule');
        const redisUrl = configuration().redisUrl;
        if (!redisUrl) {
          return null;
        }

        try {
          const reconnectStrategy = (retries: number) => {
            if (retries > 20) {
              logger.error(`Redis reconnection failed after ${retries} retries`);
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 5000);
          };
          const isUpstash = redisUrl.includes('upstash.io') || redisUrl.includes('upstash.com');
          const isTls = redisUrl.startsWith('rediss://');

          const parsedUrl = new URL(redisUrl);
          const clientConfig: Parameters<typeof createClient>[0] = {
            url: redisUrl,
            username: parsedUrl.username || 'default',
            password: decodeURIComponent(parsedUrl.password),
            socket: {
              keepAlive: true,
              keepAliveInitialDelay: 10000,
              reconnectStrategy,
              ...(isUpstash || isTls ? { tls: true } : {}),
            },
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createClient options vary by Redis driver
          const client = createClient(clientConfig as any) as RedisClientType;

          client.on('error', (err) => {
            logger.error(`Redis client error: ${err.message}`, err);
          });

          client.on('end', () => {
            logger.warn('Redis client connection ended');
          });

          client.on('reconnecting', () => {
            logger.warn('Redis client reconnecting');
          });

          await client.connect();
          return client;
        } catch (error) {
          logger.warn('Redis connection failed, continuing without cache:', error);
          return null;
        }
      },
    },
    RedisService,
    RedisHelperService,
  ],
  exports: ['REDIS_CLIENT', RedisService, RedisHelperService],
})
export class RedisModule {}
