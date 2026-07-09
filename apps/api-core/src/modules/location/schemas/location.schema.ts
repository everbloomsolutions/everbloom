import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { COLLECTION_LOCATION_TYPES } from '../../../types/collections';

export type LocationDocument = Location & Document;

@Schema({ timestamps: true })
export class Location {
  @Prop({
    enum: [
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
      COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
    ],
    required: true,
    index: true,
  })
  locationType!: string;

  @Prop({ required: true, trim: true, maxlength: 200, index: 'text' })
  locationName!: string;

  @Prop({ required: true, trim: true, maxlength: 200, index: true })
  locality!: string;

  @Prop({ required: true, trim: true, maxlength: 500, index: 'text' })
  address!: string;

  @Prop({ trim: true, maxlength: 100, index: true })
  city?: string;

  @Prop({ trim: true, maxlength: 100, index: true })
  state?: string;

  @Prop({ trim: true, maxlength: 20 })
  zipCode?: string;

  @Prop({
    type: {
      lat: Number,
      lng: Number,
    },
  })
  coordinates?: {
    lat: number;
    lng: number;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedToAgent?: Types.ObjectId;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Prop({ index: true })
  deletedAt?: Date;

  @Prop({ default: 0, min: 0, index: true })
  usageCount!: number;

  @Prop()
  lastUsedAt?: Date;

  @Prop([{ type: String, trim: true }])
  tags?: string[];

  @Prop({ trim: true, maxlength: 50 })
  group?: string;

  @Prop({ maxlength: 2000 })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  notesUpdatedBy?: Types.ObjectId;

  @Prop()
  notesUpdatedAt?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

// Indexes
LocationSchema.index({ locationType: 1, isDeleted: 1 });
LocationSchema.index({ createdBy: 1, isDeleted: 1 });
LocationSchema.index({ assignedToAgent: 1, isDeleted: 1 });
LocationSchema.index({ isActive: 1, isDeleted: 1 });
LocationSchema.index({ usageCount: -1 });
LocationSchema.index({ lastUsedAt: -1 });
LocationSchema.index({ tags: 1 });
LocationSchema.index({ group: 1 });
