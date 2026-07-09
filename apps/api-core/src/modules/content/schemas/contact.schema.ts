import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new',
  })
  status!: 'new' | 'read' | 'replied' | 'archived';

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Indexes
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ createdAt: -1 });
