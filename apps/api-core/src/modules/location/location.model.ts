import mongoose, { Document, Schema } from 'mongoose';
import { CollectionLocationType, COLLECTION_LOCATION_TYPES } from '../../types/collections';

export interface ILocation extends Document {
  locationType: CollectionLocationType;
  locationName: string;
  locality: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdBy: mongoose.Types.ObjectId;
  assignedToAgent?: mongoose.Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  usageCount: number;
  lastUsedAt?: Date;
  tags?: string[];
  group?: string;
  notes?: string;
  notesUpdatedBy?: mongoose.Types.ObjectId;
  notesUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    locationType: {
      type: String,
      enum: [
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
        COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
      ],
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: 'text',
    },
    locality: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      index: 'text',
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedToAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    group: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    notesUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notesUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Composite indexes for common queries
locationSchema.index({ locationType: 1, city: 1 });
locationSchema.index({ city: 1, state: 1 });
locationSchema.index({ isActive: 1, isDeleted: 1 });
locationSchema.index({ usageCount: -1 });
locationSchema.index({ tags: 1 });
locationSchema.index({ group: 1 });
locationSchema.index({ lastUsedAt: -1 });

// Compound index for filtered queries
locationSchema.index({ isDeleted: 1, isActive: 1, locationType: 1 });
locationSchema.index({ isDeleted: 1, city: 1, state: 1 });

// Text search index (compound index for $text search queries)
// Note: Individual fields already have index: 'text', MongoDB creates compound index automatically
// But we can explicitly create it for better control
locationSchema.index({ locationName: 'text', address: 'text' });

// Additional compound indexes for common query patterns
// Note: isDeleted + isActive + locationType index already defined above (line 142)
locationSchema.index({ isDeleted: 1, createdBy: 1, createdAt: -1 });
locationSchema.index({ isDeleted: 1, lastUsedAt: -1 });

// Unique compound index to prevent duplicate locations
// Sparse index: only applies to non-deleted locations
// This prevents duplicates at the database level and handles race conditions
locationSchema.index(
  { locationType: 1, locationName: 1, locality: 1, address: 1 },
  {
    unique: true,
    partialFilterExpression: {
      $and: [{ isDeleted: { $ne: true } }, { deletedAt: { $exists: false } }],
    },
    name: 'unique_location_type_name_locality_address',
  }
);

export const Location = mongoose.model<ILocation>('Location', locationSchema);

