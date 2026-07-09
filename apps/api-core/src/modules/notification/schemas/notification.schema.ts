import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ required: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, maxlength: 1000 })
  message!: string;

  @Prop({
    enum: ['info', 'success', 'warning', 'error', 'inquiry'],
    default: 'info',
    index: true,
  })
  type!: 'info' | 'success' | 'warning' | 'error' | 'inquiry';

  @Prop({ default: false })
  isRead!: boolean;

  @Prop()
  link?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1 });
