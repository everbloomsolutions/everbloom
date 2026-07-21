import { DynamicModule, Module } from '@nestjs/common';
import { BullModule, BullModuleAsyncOptions, BullModuleOptions } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RedisHelperService } from '../redis/redis-helper.service';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../logger/logger.module';
import { MailModule } from '../mail/mail.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerQueueService } from './scheduler-queue.service';
import { SchedulerServiceNoOp } from './scheduler-noop.service';
import { SchedulerQueueServiceNoOp } from './scheduler-noop.service';
import { EmailProcessor } from './processors/email.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { AuditCleanupProcessor } from './processors/audit-cleanup.processor';
import { ImportProcessor } from './processors/import.processor';
import { TokenBlacklist, TokenBlacklistSchema } from '../../modules/auth/schemas/token-blacklist.schema';
import { AuditLog, AuditLogSchema } from '../../modules/audit/schemas/audit-log.schema';

const baseImports = [
  ConfigModule,
  MongooseModule.forFeature([
    { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    { name: AuditLog.name, schema: AuditLogSchema },
  ]),
  RedisModule,
  LoggerModule,
  MailModule,
];

function getQueueRedisConfig(redisHelper: RedisHelperService): BullModuleOptions['redis'] {
  const conn = redisHelper.getBullRedisConnection();
  if (!conn) {
    throw new Error(
      'Redis URL is not configured. On Vercel, leave REDIS_URL unset to use the no-op scheduler (no queues).',
    );
  }
  return typeof conn === 'string' ? conn : conn.redis;
}

function createQueueAsyncOption(
  name: string,
  extraOptions: Omit<BullModuleOptions, 'name' | 'redis'> = {},
): BullModuleAsyncOptions {
  return {
    name,
    imports: [RedisModule],
    useFactory: (redisHelper: RedisHelperService) => ({
      name,
      redis: getQueueRedisConfig(redisHelper),
      ...extraOptions,
    }),
    inject: [RedisHelperService],
  };
}

const bullQueueAsync = hasRedisEnabled()
  ? [
      BullModule.registerQueueAsync(
        createQueueAsyncOption('email'),
        createQueueAsyncOption('cleanup'),
        createQueueAsyncOption('analytics'),
        createQueueAsyncOption('audit-cleanup'),
        createQueueAsyncOption('import', {
          defaultJobOptions: {
            removeOnComplete: {
              age: 24 * 3600,
              count: 100,
            },
            removeOnFail: {
              age: 7 * 24 * 3600,
            },
            attempts: 1,
          },
        }),
      ),
    ]
  : [];

/** Same Redis URL logic as configuration() so scheduler and config stay in sync (e.g. Vercel no-op when REDIS_URL unset). */
function hasRedisEnabled(): boolean {
  const isVercel = !!process.env.VERCEL;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const redisUrl =
    process.env.REDIS_URL ??
    (nodeEnv === 'production' || isVercel ? '' : 'redis://localhost:6379');
  return String(redisUrl).trim().length > 0;
}

/**
 * Scheduler (Bull/Redis) module. Must be imported via SchedulerModule.forRoot() in all consumers
 * (AppModule, AdminModule, etc.) so Nest can resolve SchedulerService / SchedulerQueueService.
 */
@Module({})
export class SchedulerModule {
  /**
   * Register SchedulerModule. When REDIS_URL is set, Bull and real queue services
   * are used; otherwise no-op services are registered so the app runs without Redis (e.g. Vercel).
   */
  static forRoot(): DynamicModule {
    const hasRedis = hasRedisEnabled();

    const providers = hasRedis
      ? [
          SchedulerService,
          SchedulerQueueService,
          EmailProcessor,
          CleanupProcessor,
          AnalyticsProcessor,
          AuditCleanupProcessor,
          ImportProcessor,
        ]
      : [
          { provide: SchedulerService, useClass: SchedulerServiceNoOp },
          { provide: SchedulerQueueService, useClass: SchedulerQueueServiceNoOp },
        ];

    const imports = [...baseImports, ...(hasRedis ? bullQueueAsync : [])];
    const exports = hasRedis
      ? [SchedulerService, SchedulerQueueService, BullModule]
      : [SchedulerService, SchedulerQueueService];

    return {
      module: SchedulerModule,
      imports,
      providers,
      exports,
    };
  }
}
