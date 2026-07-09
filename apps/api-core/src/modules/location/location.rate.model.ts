import mongoose, { Document, Schema } from 'mongoose';
import { MATERIAL_TYPE_ENUM, MaterialType } from '../../types/collections';

export interface ILocationItemTypeRate extends Document {
  locationId: mongoose.Types.ObjectId;
  materialType: MaterialType;
  rate: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const locationItemTypeRateSchema = new Schema<ILocationItemTypeRate>(
  {
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    materialType: {
      type: String,
      enum: MATERIAL_TYPE_ENUM,
      required: true,
      index: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LOCATION_ITEM_TYPE_RATE_MODEL_NAME = 'LocationItemTypeRate';

export const LocationItemTypeRateSchema = locationItemTypeRateSchema;

// Compound unique index: one active rate per location-materialType combination
locationItemTypeRateSchema.index(
  { locationId: 1, materialType: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'unique_location_material_active',
  }
);

// Indexes for common queries
locationItemTypeRateSchema.index({ locationId: 1, isActive: 1 });
locationItemTypeRateSchema.index({ materialType: 1, isActive: 1 });

export const LocationItemTypeRate = mongoose.model<ILocationItemTypeRate>(
  LOCATION_ITEM_TYPE_RATE_MODEL_NAME,
  locationItemTypeRateSchema
);
