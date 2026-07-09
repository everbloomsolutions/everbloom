import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { COLLECTION_LOCATION_TYPES, MATERIAL_TYPE_ENUM } from '../../../types/collections';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    enum: ['recycling', 'cctv', 'access-control', 'fire-safety', 'networking', 'home-automation', 'other'],
    required: true,
    index: true,
  })
  serviceType!: string;

  @Prop({ required: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, maxlength: 5000 })
  description!: string;

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
  })
  location?: {
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @Prop({ type: Types.ObjectId, ref: 'Location', index: true })
  locationId?: Types.ObjectId;

  @Prop({
    enum: [
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
      COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
    ],
  })
  locationType?: string;

  @Prop({ trim: true, maxlength: 200 })
  locationName?: string;

  @Prop({
    type: [
      {
        materialType: { type: String, enum: MATERIAL_TYPE_ENUM, required: true },
        weight: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
  })
  collectionItems?: Array<{
    materialType: string;
    weight: number;
    rate: number;
    amount: number;
  }>;

  @Prop({ min: 0 })
  totalWeight?: number;

  @Prop({ min: 0 })
  subTotal?: number;

  @Prop({ min: 0, max: 100 })
  gstRate?: number;

  @Prop({ min: 0 })
  gstAmount?: number;

  @Prop({ min: 0 })
  totalAmount?: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  collectedBy?: Types.ObjectId;

  @Prop()
  collectionDate?: Date;

  @Prop()
  receiptNumber?: string;

  @Prop({ min: 0 })
  quoteAmount?: number;

  @Prop({ maxlength: 2000 })
  quoteDetails?: string;

  @Prop()
  estimatedTimeline?: string;

  @Prop()
  quotedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  quotedBy?: Types.ObjectId;

  @Prop({
    enum: ['pending', 'quoted', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status!: string;

  @Prop({
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ min: 0, max: 100 })
  progress?: number;

  @Prop({
    type: [
      {
        title: String,
        description: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
  })
  milestones?: Array<{
    title: string;
    description?: string;
    completed: boolean;
    completedAt?: Date;
  }>;

  @Prop({
    type: [
      {
        url: String,
        name: String,
        type: String,
        uploadedAt: Date,
      },
    ],
  })
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    uploadedAt: Date;
  }>;

  @Prop({
    type: [
      {
        message: String,
        addedBy: { type: Types.ObjectId, ref: 'User' },
        addedAt: Date,
        isInternal: Boolean,
      },
    ],
  })
  notes?: Array<{
    message: string;
    addedBy: Types.ObjectId;
    addedAt: Date;
    isInternal?: boolean;
  }>;

  @Prop({
    type: [
      {
        modifiedBy: { type: Types.ObjectId, ref: 'User' },
        modifiedAt: Date,
        action: String,
        changes: Object,
        notes: String,
      },
    ],
  })
  modificationHistory?: Array<{
    modifiedBy: Types.ObjectId;
    modifiedAt: Date;
    action: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    notes?: string;
  }>;

  @Prop({ default: false, index: true })
  isDeleted?: boolean;

  @Prop({ index: true })
  deletedAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Indexes
ProjectSchema.index({ userId: 1, status: 1, createdAt: -1 });
ProjectSchema.index({ serviceType: 1, status: 1 });
ProjectSchema.index({ locationId: 1, isDeleted: 1 });
ProjectSchema.index({ collectedBy: 1, isDeleted: 1 });
ProjectSchema.index({ isDeleted: 1, createdAt: -1 });
ProjectSchema.index({ receiptNumber: 1 });
