import mongoose, { Document, Schema } from 'mongoose';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired tokens
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
passwordResetTokenSchema.index({ token: 1, used: 1 });
passwordResetTokenSchema.index({ userId: 1 });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>(
  'PasswordResetToken',
  passwordResetTokenSchema
);
