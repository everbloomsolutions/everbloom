import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface UserDocument extends User, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
})
  email!: string;

  @Prop({
    type: String,
    required: true,
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
        validator: function (v: string) {
            return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
        },
        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
    }
})
  password!: string;

  @Prop({
    type: String,
    trim: true, index: true
})
  name?: string;

  @Prop({
    type: String,
    enum: ['user', 'agent', 'admin', 'super_admin'],
    default: 'agent'
})
  role!: 'user' | 'agent' | 'admin' | 'super_admin';

  @Prop({
    type: Boolean,
    default: true
})
  isActive!: boolean;

  @Prop({ type: String })
  avatar?: string;

  @Prop({
    type: String,
    trim: true
})
  phoneNumber?: string;

  @Prop({
    type: String,
    trim: true
})
  company?: string;

  @Prop({ type: Object, default: {} })
  preferences?: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'Location', index: true })
  defaultLocation?: Types.ObjectId;

  @Prop({
    type: Boolean,
    default: false, index: true
})
  onboardingCompleted?: boolean;

  @Prop({
    type: Boolean,
    default: false, index: true
})
  isDeleted?: boolean;

  @Prop({
    type: Date,
    index: true
})
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
UserSchema.index({ isDeleted: 1, role: 1, createdAt: -1 });
UserSchema.index({ isDeleted: 1, isActive: 1, role: 1 });
UserSchema.index({ isDeleted: 1, createdAt: -1 });
UserSchema.index({ email: 1, isDeleted: 1 });
