import mongoose, { Document, Schema } from 'mongoose';
import { CollectionItem } from '../project/project.model';
import { COLLECTION_LOCATION_TYPES, MATERIAL_TYPE_ENUM } from '../../types/collections';

export interface IReceipt extends Document {
  receiptNumber: string; // Unique receipt number
  collectionId: mongoose.Types.ObjectId; // Reference to collection/project
  companyName: string; // Company name for receipt
  locationType?: string;
  locationName?: string;
  address?: {
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  collectionItems: CollectionItem[];
  totalWeight: number;
  subTotal: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  collectionDate: Date;
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId; // Admin/Agent who generated
  upiTransactionId: string; // UPI Transaction ID/UTR (12 digits)
  pdfUrl?: string; // URL to generated PDF (if stored)
  createdAt: Date;
  updatedAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true, // unique: true automatically creates an index
      trim: true,
    },
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      default: 'Ever Blooming Recycling Solutions Pvt ltd',
    },
    locationType: {
      type: String,
      enum: [
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
      ],
    },
    locationName: {
      type: String,
      trim: true,
    },
    address: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
    },
    collectionItems: [{
      materialType: {
        type: String,
        enum: MATERIAL_TYPE_ENUM,
        required: true,
      },
      weight: {
        type: Number,
        required: true,
        min: 0,
      },
      rate: {
        type: Number,
        required: true,
        min: 0,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
    }],
    totalWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    collectionDate: {
      type: Date,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    upiTransactionId: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{12}$/,
      validate: {
        validator: function(v: string) {
          return /^\d{12}$/.test(v);
        },
        message: 'UPI Transaction ID/UTR must be exactly 12 digits',
      },
    },
    pdfUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Note: collectionId and receiptNumber already have index: true in field definitions
receiptSchema.index({ generatedBy: 1, generatedAt: -1 });
receiptSchema.index({ collectionDate: -1 });

// Text search index for $or queries with regex
receiptSchema.index({ receiptNumber: 'text', locationName: 'text' });

// Compound index for date range queries
receiptSchema.index({ collectionDate: -1, generatedAt: -1 });

// Index for collectionId lookups (already indexed, but add compound for joins)
receiptSchema.index({ collectionId: 1, generatedAt: -1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema);

