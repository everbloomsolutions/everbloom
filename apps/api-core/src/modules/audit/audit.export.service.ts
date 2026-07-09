import { AuditLog, IAuditLog } from './audit.model';
import { Types } from 'mongoose';
import { ValidationService } from '../../common/validation/validation.service';
import { AuditAction, EntityType } from './audit.model';

export interface ExportFilters {
  entityType?: EntityType;
  entityId?: string;
  action?: AuditAction;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogsToCSV = async (
  filters?: ExportFilters
): Promise<string> => {
  const validationService = new ValidationService();
  const filter: Record<string, unknown> = {};
  
  if (filters?.entityType) {
    filter.entityType = filters.entityType;
  }
  
  if (filters?.entityId) {
    filter.entityId = validationService.validateObjectId(filters.entityId, 'entityId');
  }
  
  if (filters?.action) {
    filter.action = filters.action;
  }
  
  if (filters?.performedBy) {
    filter.performedBy = validationService.validateObjectId(filters.performedBy, 'performedBy');
  }
  
  if (filters?.startDate || filters?.endDate) {
    filter.createdAt = {};
    if (filters.startDate) {
      (filter.createdAt as Record<string, unknown>).$gte = filters.startDate;
    }
    if (filters.endDate) {
      (filter.createdAt as Record<string, unknown>).$lte = filters.endDate;
    }
  }
  
  if (filters?.search) {
    filter.$text = { $search: filters.search };
  }
  
  const auditLogs = await AuditLog.find(filter)
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  
  // CSV header
  const headers = [
    'Timestamp',
    'Entity Type',
    'Entity ID',
    'Action',
    'Description',
    'Performed By',
    'User Email',
    'IP Address',
    'User Agent',
    'Request ID',
    'Session ID',
    'Endpoint',
    'Method',
    'Notes',
  ];
  
  // CSV rows
  const rows = (auditLogs as unknown as IAuditLog[]).map((log: IAuditLog & { performedBy?: { name?: string; email?: string } | Types.ObjectId }) => {
    const performedBy = log.performedBy as unknown as { name?: string; email?: string } | null;
    
    return [
      log.createdAt.toISOString(),
      log.entityType,
      log.entityId.toString(),
      log.action,
      log.description || '',
      performedBy?.name || '',
      performedBy?.email || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.requestId || '',
      log.sessionId || '',
      log.endpoint || '',
      log.method || '',
      log.notes || '',
    ].map(field => {
      // Escape CSV special characters
      const str = String(field || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
  });
  
  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  return csvContent;
};

/**
 * Export audit logs to JSON format
 */
export const exportAuditLogsToJSON = async (
  filters?: ExportFilters
): Promise<IAuditLog[]> => {
  const validationService = new ValidationService();
  const filter: Record<string, unknown> = {};
  
  if (filters?.entityType) {
    filter.entityType = filters.entityType;
  }
  
  if (filters?.entityId) {
    filter.entityId = validationService.validateObjectId(filters.entityId, 'entityId');
  }
  
  if (filters?.action) {
    filter.action = filters.action;
  }
  
  if (filters?.performedBy) {
    filter.performedBy = validationService.validateObjectId(filters.performedBy, 'performedBy');
  }
  
  if (filters?.startDate || filters?.endDate) {
    filter.createdAt = {};
    if (filters.startDate) {
      (filter.createdAt as Record<string, unknown>).$gte = filters.startDate;
    }
    if (filters.endDate) {
      (filter.createdAt as Record<string, unknown>).$lte = filters.endDate;
    }
  }
  
  if (filters?.search) {
    filter.$text = { $search: filters.search };
  }
  
  const auditLogs = await AuditLog.find(filter)
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  
  // Convert to plain objects for JSON export
  return (auditLogs as unknown as IAuditLog[]).map((log: IAuditLog & { performedBy?: { name?: string; email?: string } | Types.ObjectId }) => {
    const performedBy = log.performedBy as unknown as { name?: string; email?: string } | null;
    
    return {
      _id: log._id.toString(),
      entityType: log.entityType,
      entityId: log.entityId.toString(),
      action: log.action,
      description: log.description,
      performedBy: performedBy ? {
        name: performedBy.name,
        email: performedBy.email,
      } : null,
      changes: log.changes,
      notes: log.notes,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      requestId: log.requestId,
      sessionId: log.sessionId,
      endpoint: log.endpoint,
      method: log.method,
      createdAt: log.createdAt.toISOString(),
    };
  }) as unknown as IAuditLog[];
};

