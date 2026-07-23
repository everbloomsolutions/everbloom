import { Inject } from '@nestjs/common';
import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerService } from '../../logger/logger.service';
import { AuditLog } from '../../../modules/audit/schemas/audit-log.schema';
import { AUDIT_RETENTION } from '../../../config/constants';

export interface AuditCleanupJobData {
  retentionDays?: number;
  dryRun?: boolean;
}

/**
 * Clean up old audit logs based on retention policy
 */
async function cleanupAuditLogs(
  auditLogModel: Model<AuditLog>,
  retentionDays: number = AUDIT_RETENTION.DEFAULT_RETENTION_DAYS,
  dryRun: boolean = false
): Promise<{ deletedCount: number; criticalPreserved: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const criticalCutoffDate = new Date();
  criticalCutoffDate.setDate(criticalCutoffDate.getDate() - AUDIT_RETENTION.CRITICAL_RETENTION_DAYS);
  
  // Find logs to delete (older than retention period, but preserve critical actions)
  const query = {
    createdAt: { $lt: cutoffDate },
    // Preserve critical actions (deletions, transfers) for longer period
    $or: [
      { action: { $nin: ['deleted', 'transferred'] } },
      { createdAt: { $gte: criticalCutoffDate } },
    ],
  };
  
  if (dryRun) {
    const count = await auditLogModel.countDocuments(query);
    return { deletedCount: count, criticalPreserved: 0 };
  }
  
  const result = await auditLogModel.deleteMany(query);
  const criticalCount = await auditLogModel.countDocuments({
    createdAt: { $lt: cutoffDate, $gte: criticalCutoffDate },
    action: { $in: ['deleted', 'transferred'] },
  });
  
  return {
    deletedCount: result.deletedCount,
    criticalPreserved: criticalCount,
  };
}

@Processor('audit-cleanup')
export class AuditCleanupProcessor {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    @Inject(LoggerService) private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuditCleanupProcessor');
  }

  @Process()
  async handleAuditCleanup(job: Job<AuditCleanupJobData>): Promise<{ deletedCount: number; criticalPreserved: number }> {
    const { retentionDays, dryRun } = job.data;

    this.logger.log(`Processing audit cleanup job ${job.id} (retention: ${retentionDays || AUDIT_RETENTION.DEFAULT_RETENTION_DAYS} days)`);

    try {
      const result = await cleanupAuditLogs(
        this.auditLogModel,
        retentionDays || AUDIT_RETENTION.DEFAULT_RETENTION_DAYS,
        dryRun || false
      );

      if (dryRun) {
        this.logger.log(`[DRY RUN] Would delete ${result.deletedCount} audit logs older than ${retentionDays || AUDIT_RETENTION.DEFAULT_RETENTION_DAYS} days`);
      } else {
        this.logger.log(`Cleaned up ${result.deletedCount} audit logs older than ${retentionDays || AUDIT_RETENTION.DEFAULT_RETENTION_DAYS} days`);
        this.logger.log(`Preserved ${result.criticalPreserved} critical audit logs (deletions/transfers)`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Audit cleanup job ${job.id} failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<AuditCleanupJobData>, result: { deletedCount: number; criticalPreserved: number }) {
    this.logger.log(`Audit cleanup job ${job.id} completed: deleted ${result.deletedCount} logs, preserved ${result.criticalPreserved} critical logs`);
  }

  @OnQueueFailed()
  onFailed(job: Job<AuditCleanupJobData> | undefined, err: Error) {
    this.logger.error(`Audit cleanup job ${job?.id} failed:`, err.message);
  }
}
