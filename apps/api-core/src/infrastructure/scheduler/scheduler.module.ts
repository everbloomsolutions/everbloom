import { DynamicModule, Module, Provider } from '@nestjs/common';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
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
  MongooseModule.forFeature([
    { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
    { name: AuditLog.name, schema: AuditLogSchema },
  ]),
  RedisModule,
  LoggerModule,
  MailModule,
];

export interface SchedulerModuleOptions {
  redisUrl?: string;
}

function getQueueRedisConfig(redisUrl: string): BullModuleOptions['redis'] {
  const conn = getBullRedisConnectionFromUrl(redisUrl);
  if (!conn) {
    throw new Error(
      'Redis URL is not configured. On Vercel, leave REDIS_URL unset to use the no-op scheduler (no queues).',
    );
  }
  return typeof conn === 'string' ? conn : conn.redis;
}

const bullQueuesCache = new Map<string, DynamicModule>();

function getBullQueues(redisUrl: string): DynamicModule {
  if (!bullQueuesCache.has(redisUrl)) {
    const bullRedis = getQueueRedisConfig(redisUrl);
    bullQueuesCache.set(
      redisUrl,
      BullModule.registerQueue(
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
      ),
    );
  }
  return bullQueuesCache.get(redisUrl)!;
}

const schedulerModuleCache = new Map<string, DynamicModule>();

/**
 * Scheduler (Bull/Redis) module. Must be imported via SchedulerModule.forRoot() in all consumers
 * (AppModule, AdminModule, etc.) so Nest can resolve SchedulerService / SchedulerQueueService.
 */
@Module({})
export class SchedulerModule {
  /**
   * Register SchedulerModule. When redisUrl is set, Bull and real queue services
   * are used; otherwise no-op services are registered so the app runs without Redis (e.g. Vercel).
   */
  static forRoot(options: SchedulerModuleOptions = {}): DynamicModule {
    const redisUrl = options.redisUrl?.trim() ?? '';
    const cacheKey = redisUrl || 'disabled';

    if (schedulerModuleCache.has(cacheKey)) {
      return schedulerModuleCache.get(cacheKey)!;
    }

    const hasRedis = redisUrl.length > 0;

    const providers: Provider[] = hasRedis
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

    const imports: any[] = [...baseImports];
    if (hasRedis) {
      imports.push(getBullQueues(redisUrl));
    }

    const exports = hasRedis
      ? [SchedulerService, SchedulerQueueService, BullModule]
      : [SchedulerService, SchedulerQueueService];

    const module: DynamicModule = {
      module: SchedulerModule,
      imports,
      providers,
      exports,
    };

    schedulerModuleCache.set(cacheKey, module);
    return module;
  }
}
