import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ValidationService } from '../../common/validation/validation.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private validationService: ValidationService,
  ) {}

  async getAuditLogs(query: AuditLogQueryDto): Promise<any> {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) {
      filter.entityId = this.validationService.validateObjectId(query.entityId, 'entityId');
    }
    if (query.action) filter.action = query.action;
    if (query.performedBy) {
      filter.performedBy = this.validationService.validateObjectId(query.performedBy, 'performedBy');
    }
    if (query.ipAddress) filter.ipAddress = query.ipAddress;
    if (query.requestId) filter.requestId = query.requestId;
    if (query.sessionId) filter.sessionId = query.sessionId;

    if (query.startDate || query.endDate) {
      const createdAt: Record<string, unknown> = {};
      if (query.startDate) createdAt.$gte = new Date(query.startDate);
      if (query.endDate) createdAt.$lte = new Date(query.endDate);
      filter.createdAt = createdAt;
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    filters?: {
      page?: number;
      limit?: number;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any> {
    const page = Math.max(Number(filters?.page || 1), 1);
    const limit = Math.min(Math.max(Number(filters?.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      entityType,
      entityId: this.validationService.validateObjectId(entityId, 'entityId'),
    };

    if (filters?.action) {
      filter.action = filters.action;
    }
    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, unknown> = {};
      if (filters.startDate) createdAt.$gte = filters.startDate;
      if (filters.endDate) createdAt.$lte = filters.endDate;
      filter.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAuditLogStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    entityType?: string;
  }): Promise<any> {
    const match: Record<string, unknown> = {};
    if (filters?.entityType) match.entityType = filters.entityType;
    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, unknown> = {};
      if (filters?.startDate) createdAt.$gte = filters.startDate;
      if (filters?.endDate) createdAt.$lte = filters.endDate;
      match.createdAt = createdAt;
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as -1 } },
    ];

    const byAction = await this.auditLogModel.aggregate(pipeline as any).exec();
    const total = byAction.reduce((sum: number, a: any) => sum + (a.count || 0), 0);
    return {
      total,
      byAction: byAction.reduce((acc: Record<string, number>, row: any) => {
        acc[String(row._id)] = Number(row.count) || 0;
        return acc;
      }, {}),
    };
  }

  async getEnhancedAuditLogStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    entityType?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<any> {
    const match: Record<string, unknown> = {};
    if (filters?.entityType) match.entityType = filters.entityType;
    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, unknown> = {};
      if (filters?.startDate) createdAt.$gte = filters.startDate;
      if (filters?.endDate) createdAt.$lte = filters.endDate;
      match.createdAt = createdAt;
    }

    const groupBy = filters?.groupBy || 'day';
    const groupId =
      groupBy === 'month'
        ? { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }
        : groupBy === 'week'
          ? { y: { $year: '$createdAt' }, w: { $isoWeek: '$createdAt' } }
          : { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } };

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: {
            period: groupId,
            action: '$action',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period.y': 1 as const } },
    ];

    const rows = await this.auditLogModel.aggregate(pipeline as any).exec();

    return {
      groupBy,
      series: rows,
    };
  }

  async createAuditLog(data: {
    entityType: string;
    entityId: string | Types.ObjectId;
    action: string;
    description?: string;
    performedBy?: string | Types.ObjectId;
    changes?: Record<string, { old: unknown; new: unknown }>;
    notes?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    sessionId?: string;
    endpoint?: string;
    method?: string;
  }): Promise<AuditLogDocument> {
    // Direct implementation using NestJS schema
    const entityId = typeof data.entityId === 'string' 
      ? this.validationService.validateObjectId(data.entityId, 'entityId')
      : data.entityId;
    
    const performedBy = data.performedBy 
      ? (typeof data.performedBy === 'string' 
          ? this.validationService.validateObjectId(data.performedBy, 'performedBy')
          : data.performedBy)
      : undefined;

    const auditLog = new this.auditLogModel({
      entityType: data.entityType,
      entityId,
      action: data.action,
      description: data.description,
      performedBy,
      changes: data.changes,
      notes: data.notes,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestId: data.requestId,
      sessionId: data.sessionId,
      endpoint: data.endpoint,
      method: data.method,
    });

    return auditLog.save();
  }

  // Get the Mongoose model instance (for compatibility)
  getModel(): Model<AuditLogDocument> {
    return this.auditLogModel;
  }
}

// Export wrapper functions for Express services that import as namespace
// These allow audit.helper.ts to call AuditService methods
let auditServiceInstance: AuditService | null = null;

export const getAuditServiceInstance = (): AuditService => {
  if (!auditServiceInstance) {
    throw new Error('AuditService instance not initialized. This should only be called from NestJS context.');
  }
  return auditServiceInstance;
};

export const setAuditServiceInstance = (instance: AuditService): void => {
  auditServiceInstance = instance;
};

// Wrapper function for Express services
export const createAuditLog = async (data: {
  entityType: string;
  entityId: string | Types.ObjectId;
  action: string;
  description?: string;
  performedBy?: string | Types.ObjectId;
  changes?: Record<string, { old: unknown; new: unknown }>;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
}): Promise<AuditLogDocument> => {
  const instance = getAuditServiceInstance();
  return instance.createAuditLog(data);
};
