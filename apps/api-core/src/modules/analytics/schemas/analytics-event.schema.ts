import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ timestamps: true })
export class AnalyticsEvent {
  @Prop({ required: true, index: true })
  eventType!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop()
  sessionId?: string;

  @Prop({ type: Object, default: {} })
  properties?: Record<string, unknown>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// Indexes
AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ userId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ createdAt: -1 });
AnalyticsEventSchema.index({ eventType: 1, userId: 1, createdAt: -1 });
