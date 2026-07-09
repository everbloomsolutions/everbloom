import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  eventType: string;
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  properties?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    properties: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ eventType: 1, userId: 1, createdAt: -1 });
// Additional indexes already present - no new indexes needed

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);

