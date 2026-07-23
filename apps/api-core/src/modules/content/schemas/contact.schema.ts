import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({
    type: String,
    required: true, trim: true
})
  name!: string;

  @Prop({
    type: String,
    required: true, lowercase: true, trim: true
})
  email!: string;

  @Prop({
    type: String,
    required: true, trim: true
})
  subject!: string;

  @Prop({
    type: String,
    required: true
})
  message!: string;

  @Prop({
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
})
  status!: 'new' | 'read' | 'replied' | 'archived';

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Indexes
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ createdAt: -1 });
