import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({
    type: String,
    enum: ['project', 'receipt', 'user', 'location', 'contact', 'other'],
    required: true,
    index: true,
  })
  entityType!: EntityType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId!: Types.ObjectId;

  @Prop({
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
  })
  action!: AuditAction;

  @Prop({
    type: String,
    maxlength: 500
})
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  performedBy?: Types.ObjectId;

  @Prop({ type: Object })
  changes?: Record<string, { old: unknown; new: unknown }>;

  @Prop({
    type: String,
    maxlength: 1000
})
  notes?: string;

  @Prop({
    type: String,
    index: true
})
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({
    type: String,
    index: true
})
  requestId?: string;

  @Prop({
    type: String,
    index: true
})
  sessionId?: string;

  @Prop({ type: String })
  endpoint?: string;

  @Prop({
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
})
  method?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Compound indexes
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ createdAt: -1, action: 1 });
AuditLogSchema.index({ description: 'text', notes: 'text' });
