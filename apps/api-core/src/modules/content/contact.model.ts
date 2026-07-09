import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
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
contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

// Text search index for $or queries with regex
contactSchema.index({ name: 'text', email: 'text', subject: 'text', message: 'text' });

// Compound index for status + date queries
contactSchema.index({ status: 1, createdAt: -1 });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);

