import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LoggerService } from '../logger/logger.service';
import { CleanupJobData } from './processors/cleanup.processor';
import { AuditCleanupJobData } from './processors/audit-cleanup.processor';
import { AUDIT_RETENTION } from '../../config/constants';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    @InjectQueue('cleanup') private cleanupQueue: Queue<CleanupJobData>,
    @InjectQueue('audit-cleanup') private auditCleanupQueue: Queue<AuditCleanupJobData>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SchedulerService');
  }

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Scheduling recurring jobs...');

      // Schedule cleanup job (daily at 2 AM)
      await this.scheduleCleanup('all');

      // Schedule audit cleanup job (daily at 3 AM)
      await this.scheduleAuditCleanup();

      this.logger.log('Recurring jobs scheduled successfully');
    } catch (error) {
      this.logger.warn('Failed to schedule recurring jobs:', error);
    }
  }

  /**
   * Schedule cleanup job
   */
  async scheduleCleanup(type: CleanupJobData['type'] = 'all'): Promise<void> {
    try {
      await this.cleanupQueue.add(
        { type },
        {
          repeat: {
            cron: '0 2 * * *', // Run daily at 2 AM
          },
        }
      );
      this.logger.log(`Scheduled cleanup job for type: ${type}`);
    } catch (error) {
      this.logger.error('Failed to schedule cleanup job:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Schedule audit cleanup job
   */
  async scheduleAuditCleanup(retentionDays?: number): Promise<void> {
    try {
      await this.auditCleanupQueue.add(
        { retentionDays },
        {
          repeat: {
            cron: '0 3 * * *', // Run daily at 3 AM
          },
        }
      );
      this.logger.log(`Scheduled audit cleanup job (retention: ${retentionDays || AUDIT_RETENTION.DEFAULT_RETENTION_DAYS} days)`);
    } catch (error) {
      this.logger.error('Failed to schedule audit cleanup job:', error instanceof Error ? error.message : String(error));
    }
  }
}
