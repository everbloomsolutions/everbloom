import { Inject } from '@nestjs/common';
import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerService } from '../../logger/logger.service';
import { TokenBlacklist } from '../../../modules/auth/schemas/token-blacklist.schema';

export interface CleanupJobData {
  type: 'tokens' | 'all';
}

@Processor('cleanup')
export class CleanupProcessor {
  constructor(
    @InjectModel(TokenBlacklist.name) private tokenBlacklistModel: Model<TokenBlacklist>,
    @Inject(LoggerService) private readonly logger: LoggerService,
  ) {
    this.logger.setContext('CleanupProcessor');
  }

  @Process()
  async handleCleanup(job: Job<CleanupJobData>): Promise<{ success: boolean }> {
    const { type } = job.data;

    this.logger.log(`Processing cleanup job ${job.id} for type: ${type}`);

    try {
      if (type === 'tokens' || type === 'all') {
        // Clean up expired tokens (MongoDB TTL should handle this, but we'll do a manual cleanup)
        const result = await this.tokenBlacklistModel.deleteMany({
          expiresAt: { $lt: new Date() },
        });

        this.logger.log(`Cleaned up ${result.deletedCount} expired tokens`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Cleanup job ${job.id} failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<CleanupJobData>) {
    this.logger.log(`Cleanup job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job<CleanupJobData> | undefined, err: Error) {
    this.logger.error(`Cleanup job ${job?.id} failed:`, err.message);
  }
}
