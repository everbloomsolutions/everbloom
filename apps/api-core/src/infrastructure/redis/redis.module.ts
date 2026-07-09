import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { RedisService } from './redis.service';
import { RedisHelperService } from './redis-helper.service';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService): Promise<RedisClientType | null> => {
        const redisUrl = configService.get<string>('redisUrl');
        if (!redisUrl) {
          return null;
        }

        try {
          const isUpstash = redisUrl.includes('upstash.io') || redisUrl.includes('upstash.com');
          const isTls = redisUrl.startsWith('rediss://');

          const clientConfig: Parameters<typeof createClient>[0] = {
            url: redisUrl,
          };

          if (isUpstash) {
            (clientConfig as Record<string, unknown>).socket = {
              tls: true,
              reconnectStrategy: (retries: number) => {
                if (retries > 10) {
                  return new Error('Redis reconnection failed');
                }
                return Math.min(retries * 50, 1000);
              },
            };
          } else if (isTls) {
            (clientConfig as Record<string, unknown>).socket = {
              tls: true,
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createClient options vary by Redis driver
          const client = createClient(clientConfig as any) as RedisClientType;
          await client.connect();
          return client;
        } catch (error) {
          const logger = new Logger('RedisModule');
          logger.warn('Redis connection failed, continuing without cache:', error);
          return null;
        }
      },
      inject: [ConfigService],
    },
    RedisService,
    RedisHelperService,
  ],
  exports: ['REDIS_CLIENT', RedisService, RedisHelperService],
})
export class RedisModule {}
