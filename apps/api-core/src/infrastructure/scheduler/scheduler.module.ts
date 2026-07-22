import { DynamicModule, Module } from '@nestjs/common';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '../../config/configuration';
import { getBullRedisConnectionFromUrl } from '../redis/redis-helper.service';
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

/** Resolves the Redis URL from the central configuration so the scheduler and app config stay in sync. */
function getResolvedRedisUrl(): string {
  return configuration().redisUrl;
}

function hasRedisEnabled(): boolean {
  return getResolvedRedisUrl().trim().length > 0;
}

function getQueueRedisConfig(): BullModuleOptions['redis'] {
  const redisUrl = getResolvedRedisUrl();
  const conn = getBullRedisConnectionFromUrl(redisUrl);
  if (!conn) {
    throw new Error(
      'Redis URL is not configured. On Vercel, leave REDIS_URL unset to use the no-op scheduler (no queues).',
    );
  }
  return typeof conn === 'string' ? conn : conn.redis;
}

let bullQueuesModule: DynamicModule | undefined;
function getBullQueues(): DynamicModule {
  if (!bullQueuesModule) {
    bullQueuesModule = buildBullQueues();
  }
  return bullQueuesModule;
}

function buildBullQueues() {
  const bullRedis = getQueueRedisConfig();
  return BullModule.registerQueue(
    { name: 'email', redis: bullRedis },
    { name: 'cleanup', redis: bullRedis },
    { name: 'analytics', redis: bullRedis },
    { name: 'audit-cleanup', redis: bullRedis },
    {
      name: 'import',
      redis: bullRedis,
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
    },
  );
}

let schedulerModule: DynamicModule | undefined;

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
    if (schedulerModule) {
      return schedulerModule;
    }

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

    const imports = hasRedis
      ? [...baseImports, getBullQueues()]
      : [...baseImports];
    const exports = hasRedis
      ? [SchedulerService, SchedulerQueueService, BullModule]
      : [SchedulerService, SchedulerQueueService];

    schedulerModule = {
      module: SchedulerModule,
      imports,
      providers,
      exports,
    };
    return schedulerModule;
  }
}
