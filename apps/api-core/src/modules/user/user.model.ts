import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password?: string;
  name?: string;
  role: 'user' | 'agent' | 'admin' | 'super_admin';
  isActive: boolean;
  avatar?: string;
  phoneNumber?: string;
  company?: string;
  preferences?: Record<string, unknown>;
  defaultLocation?: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Type for user data without password (for API responses)
export interface IUserResponse {
  _id: string;
  email: string;
  name?: string;
  role: 'user' | 'agent' | 'admin' | 'super_admin';
  isActive: boolean;
  avatar?: string;
  phoneNumber?: string;
  company?: string;
  preferences?: Record<string, unknown>;
  defaultLocation?: string | {
    _id: string;
    locationName: string;
    address: string;
    city?: string;
    state?: string;
    locationType: string;
  };
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert user to response type
export const toUserResponse = (user: IUser | Record<string, unknown>): IUserResponse => {
  const obj = 'toObject' in user && typeof user.toObject === 'function'
    ? user.toObject()
    : user;
   
   
    const { password: _password, ...userWithoutPassword } = obj as Record<string, unknown>;
  const response = userWithoutPassword as unknown as IUserResponse;
  
  // Handle defaultLocation: preserve populated object, convert ObjectId to string
  if (response.defaultLocation) {
    // If it's already an object with locationName, keep it as is (populated)
    if (typeof response.defaultLocation === 'object' && 
        response.defaultLocation !== null && 
        'locationName' in response.defaultLocation) {
      // Already populated, keep as object
      return response;
    }
    // If it's an ObjectId (not populated), convert to string
    if (typeof response.defaultLocation !== 'string') {
      response.defaultLocation = (response.defaultLocation as { toString: () => string }).toString();
    }
  }
  
  return response;
};

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: 'text',
    },
    password: {
      type: String,
      required: true,
      minlength: [8, 'Password must be at least 8 characters long'],
      validate: {
        validator: function (v: string) {
          // Require at least: 1 lowercase, 1 uppercase, 1 number
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
        },
        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      },
    },
    name: {
      type: String,
      trim: true,
      index: 'text',
    },
    role: {
      type: String,
      enum: ['user', 'agent', 'admin', 'super_admin'],
      default: 'agent',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: {},
    },
    defaultLocation: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if password exists and is modified)
userSchema.pre('save', async function (next) {
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
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Critical compound indexes for common query patterns (HIGH PERFORMANCE)
userSchema.index({ isDeleted: 1, role: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, isActive: 1, role: 1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ email: 1, isDeleted: 1 }); // For email lookups excluding deleted

export const User = mongoose.model<IUser>('User', userSchema);

