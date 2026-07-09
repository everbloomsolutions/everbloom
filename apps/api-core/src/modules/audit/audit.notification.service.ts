import { AuditLog, AuditAction } from './audit.model';
import { createLogger } from '../../infrastructure/logger';
import { User } from '../user/user.model';

// Use logger factory for non-NestJS context
const logger = createLogger();

/**
 * Critical actions that should trigger notifications
 */
const CRITICAL_ACTIONS: AuditAction[] = [
  'deleted',
  'transferred',
  'user_deleted',
  'user_created',
];

/**
 * Check if an action is critical and should trigger notifications
 */
const isCriticalAction = (action: AuditAction): boolean => {
  return CRITICAL_ACTIONS.includes(action);
};

/**
 * Get admin users who should receive audit notifications
 */
const getAdminUsers = async (): Promise<Array<{ email: string; name?: string }>> => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true })
      .select('email name')
      .lean()
      .exec();

    return admins.map(admin => ({
      email: admin.email,
      name: admin.name,
    }));
  } catch (error) {
    logger.error('Failed to fetch admin users for notifications:', error);
    return [];
  }
};

/**
 * Send audit notification email
 */
export const sendAuditNotification = async (
  auditLog: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    description?: string;
    performedBy?: string;
    ipAddress?: string;
  }
): Promise<void> => {
  // Only send notifications for critical actions
  if (!isCriticalAction(auditLog.action)) {
    return;
  }

  try {
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      logger.warn('No admin users found for audit notifications');
      return;
    }

    const actionLabels: Record<string, string> = {
      deleted: 'Deletion',
      transferred: 'Transfer',
      user_deleted: 'User Deletion',
      user_created: 'User Creation',
    };

    const actionLabel = actionLabels[auditLog.action] || auditLog.action;

    const _subject = `[Audit Alert] ${actionLabel} - ${auditLog.entityType}`;

    const _html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
          .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #555; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Audit Log Alert</h2>
          </div>
          <div class="content">
            <div class="alert">
              <strong>Critical Action Detected:</strong> ${actionLabel}
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="label">Entity Type:</span> ${auditLog.entityType}
              </div>
              <div class="detail-row">
                <span class="label">Entity ID:</span> ${auditLog.entityId}
              </div>
              <div class="detail-row">
                <span class="label">Action:</span> ${auditLog.action}
              </div>
              ${auditLog.description ? `
              <div class="detail-row">
                <span class="label">Description:</span> ${auditLog.description}
              </div>
              ` : ''}
              ${auditLog.performedBy ? `
              <div class="detail-row">
                <span class="label">Performed By:</span> ${auditLog.performedBy}
              </div>
              ` : ''}
              ${auditLog.ipAddress ? `
              <div class="detail-row">
                <span class="label">IP Address:</span> ${auditLog.ipAddress}
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Timestamp:</span> ${new Date().toLocaleString()}
              </div>
            </div>

            <p style="margin-top: 20px;">
              This is an automated notification for a critical audit event.
              Please review the audit logs for more details.
            </p>
          </div>

          <div class="footer">
            <p>This is an automated message from the Audit Log System.</p>
            <p>You are receiving this because you are an administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const _text = `
Audit Log Alert - Critical Action Detected

Action: ${actionLabel}
Entity Type: ${auditLog.entityType}
Entity ID: ${auditLog.entityId}
${auditLog.description ? `Description: ${auditLog.description}\n` : ''}
${auditLog.performedBy ? `Performed By: ${auditLog.performedBy}\n` : ''}
${auditLog.ipAddress ? `IP Address: ${auditLog.ipAddress}\n` : ''}
Timestamp: ${new Date().toLocaleString()}

This is an automated notification for a critical audit event.
    `.trim();

    // Send email to all admins
    // Note: This function is called outside NestJS context, so we can't inject the queue
    // For now, we'll need to import and use the queue directly or convert this to a service
    // TODO: Convert this to a NestJS service or create a helper that can access the queue
    throw new Error('sendAuditNotification needs to be converted to use NestJS email queue');
  } catch (error) {
    logger.error('Failed to send audit notification:', error);
    // Don't throw - notifications should not break the main flow
  }
};

/**
 * Check and send notifications for a newly created audit log
 */
export const checkAndNotifyAuditLog = async (auditLogId: string): Promise<void> => {
  try {
    const auditLog = await AuditLog.findById(auditLogId)
      .populate('performedBy', 'name email')
      .lean()
      .exec();

    if (!auditLog) {
      return;
    }

    const performedBy = auditLog.performedBy as unknown as { name?: string; email?: string } | null;

    await sendAuditNotification({
      entityType: auditLog.entityType,
      entityId: auditLog.entityId.toString(),
      action: auditLog.action,
      description: auditLog.description,
      performedBy: performedBy?.email || performedBy?.name || 'System',
      ipAddress: auditLog.ipAddress,
    });
  } catch (error) {
    logger.error('Failed to check and notify audit log:', error);
  }
};

