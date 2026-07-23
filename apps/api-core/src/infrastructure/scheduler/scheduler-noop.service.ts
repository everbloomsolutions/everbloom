import { Injectable, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { LoggerService } from '../logger/logger.service';
import { ImportJobData, ImportJobResult } from './processors/import.processor';

/**
 * No-op SchedulerService when Redis is not configured (e.g. Vercel serverless).
 * Recurring cleanup/audit jobs are skipped.
 */
@Injectable()
export class SchedulerServiceNoOp {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {
    this.logger.setContext('SchedulerServiceNoOp');
  }
}

/**
 * No-op SchedulerQueueService when Redis is not configured.
 * addImportJob returns a stub job; getJobStatus returns null; cancelJob returns false.
 */
@Injectable()
export class SchedulerQueueServiceNoOp {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {
    this.logger.setContext('SchedulerQueueServiceNoOp');
  }

  async addImportJob(_data: ImportJobData): Promise<Job<ImportJobData>> {
    this.logger.warn('Redis not configured; import job skipped.');
    return { id: 'no-redis' } as unknown as Job<ImportJobData>;
  }

  async getJobStatus(_jobId: string): Promise<{
    id: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress: number;
    result?: ImportJobResult;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    finishedAt?: Date;
  } | null> {
    return null;
  }

  async cancelJob(_jobId: string): Promise<boolean> {
    return false;
  }
}
