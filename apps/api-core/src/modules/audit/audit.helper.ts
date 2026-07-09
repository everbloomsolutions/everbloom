import { Request } from 'express';
import * as auditService from './audit.service';
import { getRequestMetadata } from '../../common/interceptors/request-metadata.interceptor';
import { AuditAction, EntityType } from './audit.model';
import { checkAndNotifyAuditLog } from './audit.notification.service';
import { createLogger } from '../../infrastructure/logger';

// Use logger factory for non-NestJS context
const logger = createLogger();

/**
 * Helper function to log audit events
 * Automatically extracts request metadata if request object is provided
 * Sends notifications for critical actions
 */
export const logAuditEvent = async (
  data: {
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    description?: string;
    performedBy?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    notes?: string;
  },
  req?: Request
): Promise<void> => {
  try {
    const requestMetadata = req ? getRequestMetadata(req) : {};
    
    const auditLog = await auditService.createAuditLog({
      ...data,
      ...requestMetadata,
    });
    
    // Check and send notifications for critical actions (async, don't wait)
    (async () => {
      try {
        await checkAndNotifyAuditLog(auditLog._id.toString());
      } catch (err) {
        logger.warn('Failed to send audit notification:', err);
      }
    })();
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    // Log error but continue execution
    logger.error('Failed to create audit log:', error);
  }
};

