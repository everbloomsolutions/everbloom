import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'receipt_generated' 
  | 'transferred'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'project_started'
  | 'project_completed'
  | 'progress_updated'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'login'
  | 'logout'
  | 'other';

export type EntityType = 
  | 'project'
  | 'receipt'
  | 'user'
  | 'location'
  | 'contact'
  | 'other';

export interface IAuditLog extends Document {
  // Entity reference
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  
  // Action details
  action: AuditAction;
  description?: string;
  
  // User who performed the action
  performedBy?: mongoose.Types.ObjectId;
  
  // Changes made (old vs new values)
  changes?: Record<string, { old: unknown; new: unknown }>;
  
  // Additional notes
  notes?: string;
  
  // Request metadata
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  
  // Timestamps
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    entityType: {
      type: String,
      enum: ['project', 'receipt', 'user', 'location', 'contact', 'other'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'deleted',
        'receipt_generated',
        'transferred',
        'quote_sent',
        'quote_accepted',
        'quote_rejected',
        'project_started',
        'project_completed',
        'progress_updated',
        'user_created',
        'user_updated',
        'user_deleted',
        'login',
        'logout',
        'other',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    requestId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    endpoint: {
      type: String,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for common queries
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
// Note: requestId and sessionId already have index: true in field definitions
// Additional indexes for optimized queries
auditLogSchema.index({ createdAt: -1, action: 1 });

// Text search index for description and notes
auditLogSchema.index({ description: 'text', notes: 'text' });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

