import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  used!: boolean;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

// Indexes
PasswordResetTokenSchema.index({ token: 1, used: 1 });
PasswordResetTokenSchema.index({ userId: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
