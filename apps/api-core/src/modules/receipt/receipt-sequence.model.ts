import mongoose, { Document, Schema } from 'mongoose';

/**
 * Receipt Sequence Counter Model
 * Used for atomic receipt number generation to prevent race conditions
 */
export interface IReceiptSequence extends Document {
  date: string; // Format: YYYYMMDD
  sequence: number; // Last sequence number used
  createdAt: Date;
  updatedAt: Date;
}

const receiptSequenceSchema = new Schema<IReceiptSequence>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Note: date field already has unique: true and index: true in field definition
// No need for separate schema.index() call

export const ReceiptSequence = mongoose.model<IReceiptSequence>(
  'ReceiptSequence',
  receiptSequenceSchema
);

