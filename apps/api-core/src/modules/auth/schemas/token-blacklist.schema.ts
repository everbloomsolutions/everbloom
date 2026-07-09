import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenBlacklistDocument = TokenBlacklist & Document;

@Schema({ timestamps: true })
export class TokenBlacklist {
  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// TTL index for automatic deletion of expired tokens
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
