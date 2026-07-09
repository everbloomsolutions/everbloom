import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'inquiry';
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'inquiry'],
      default: 'info',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

