import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { LoggerService } from '../logger/logger.service';
import { ImportJobData, ImportJobResult } from './processors/import.processor';

@Injectable()
export class SchedulerQueueService {
  constructor(
    @InjectQueue('import') private importQueue: Queue<ImportJobData>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SchedulerQueueService');
  }

  /**
   * Add import job to queue
   */
  async addImportJob(data: ImportJobData): Promise<Job<ImportJobData>> {
    const job = await this.importQueue.add(data, {
      attempts: 1,
    });

    this.logger.log(`Import job ${job.id} added to queue for ${data.type} import`);
    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress: number;
    result?: ImportJobResult;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    finishedAt?: Date;
  } | null> {
    try {
      const job = await this.importQueue.getJob(jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = (job.progress() as number) || 0;

      return {
        id: String(job.id),
        status: state as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
        progress,
        result: job.returnvalue as ImportJobResult | undefined,
        error: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.importQueue.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.remove();
      this.logger.log(`Job ${jobId} cancelled`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}
