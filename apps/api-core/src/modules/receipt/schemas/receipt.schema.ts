import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { COLLECTION_LOCATION_TYPES, MATERIAL_TYPE_ENUM } from '../../../types/collections';

export type ReceiptDocument = Receipt & Document;

@Schema({ timestamps: true })
export class Receipt {
  @Prop({ required: true, unique: true, trim: true })
  receiptNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  collectionId!: Types.ObjectId;

  @Prop({ required: true, default: 'Ever Blooming Recycling Solutions Pvt ltd' })
  companyName!: string;

  @Prop({
    enum: [
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
      COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    ],
  })
  locationType?: string;

  @Prop({ trim: true })
  locationName?: string;

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      zipCode: String,
    },
  })
  address?: {
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };

  @Prop({
    type: [
      {
        materialType: { type: String, enum: MATERIAL_TYPE_ENUM, required: true },
        weight: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    required: true,
  })
  collectionItems!: Array<{
    materialType: string;
    weight: number;
    rate: number;
    amount: number;
  }>;

  @Prop({ required: true, min: 0 })
  totalWeight!: number;

  @Prop({ required: true, min: 0 })
  subTotal!: number;

  @Prop({ required: true, min: 0, max: 100 })
  gstRate!: number;

  @Prop({ required: true, min: 0 })
  gstAmount!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ required: true })
  collectionDate!: Date;

  @Prop({ required: true, default: Date.now })
  generatedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  generatedBy!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  upiTransactionId!: string;

  @Prop()
  pdfUrl?: string;
}

export const ReceiptSchema = SchemaFactory.createForClass(Receipt);

// Indexes
// Note: receiptNumber already has unique: true which creates an index automatically
ReceiptSchema.index({ collectionId: 1 });
ReceiptSchema.index({ generatedBy: 1, createdAt: -1 });
// Removed duplicate receiptNumber index - already indexed via unique: true
