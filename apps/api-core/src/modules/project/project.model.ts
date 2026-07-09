import mongoose, { Document, Schema } from 'mongoose';
import { CollectionLocationType, COLLECTION_LOCATION_TYPES, getGSTRateForMaterial, MATERIAL_TYPE_ENUM } from '../../types/collections';
import { FINANCIAL } from '../../config/constants';

export type ServiceType = 
  | 'recycling'
  | 'cctv' 
  | 'access-control' 
  | 'fire-safety' 
  | 'networking' 
  | 'home-automation'
  | 'other';

export type LocationType = CollectionLocationType;

export type MaterialType = 'mixed-plastic' | 'paper' | 'iron' | 'aluminium' | 'wood' | 'copper';

export type ProjectStatus = 
  | 'pending'      // Customer submitted, waiting for admin review
  | 'quoted'       // Admin sent quote, waiting for customer
  | 'accepted'     // Customer accepted quote
  | 'rejected'     // Customer rejected quote
  | 'in-progress'  // Work started
  | 'completed'    // Work completed
  | 'cancelled';   // Project cancelled

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface CollectionItem {
  materialType: MaterialType;
  weight: number; // in kg
  rate: number; // per kg
  amount: number; // calculated: weight * rate
}

export interface IProject extends Document {
  // User reference
  userId: mongoose.Types.ObjectId;
  
  // Service details
  serviceType: ServiceType;
  title: string;
  description: string;
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
  
  // Collection-specific fields (for recycling service type)
  locationId?: mongoose.Types.ObjectId; // Reference to registered Location
  locationType?: LocationType; // residential-apartment, residential-society, residential-gated-community
  locationName?: string; // Name of apartment/society/gated community
  collectionItems?: CollectionItem[]; // Array of materials with weights and rates
  totalWeight?: number; // Sum of all collection item weights
  subTotal?: number; // Sum of all collection item amounts (before GST)
  gstRate?: number; // GST rate (default 18%)
  gstAmount?: number; // Calculated GST amount
  totalAmount?: number; // subTotal + gstAmount
  collectedBy?: mongoose.Types.ObjectId; // Agent/Admin who collected
  collectionDate?: Date; // Date of collection
  receiptNumber?: string; // Auto-generated receipt number
  
  // Quote details
  quoteAmount?: number;
  quoteDetails?: string;
  estimatedTimeline?: string;
  quotedAt?: Date;
  quotedBy?: mongoose.Types.ObjectId; // Admin user ID
  
  // Project management
  status: ProjectStatus;
  priority: Priority;
  assignedTo?: mongoose.Types.ObjectId; // Admin/Team member
  
  // Progress tracking
  progress?: number; // 0-100
  milestones?: Array<{
    title: string;
    description?: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  
  // Documents/Attachments
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    uploadedAt: Date;
  }>;
  
  // Communication
  notes?: Array<{
    message: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
    isInternal?: boolean; // Admin-only notes
  }>;
  
  // Audit trail - track modifications
  modificationHistory?: Array<{
    modifiedBy: mongoose.Types.ObjectId;
    modifiedAt: Date;
    action: 'created' | 'updated' | 'deleted' | 'receipt_generated' | 'transferred';
    changes?: Record<string, { old: unknown; new: unknown }>;
    notes?: string;
  }>;
  
  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
  
  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: ['recycling', 'cctv', 'access-control', 'fire-safety', 'networking', 'home-automation', 'other'],
      required: true,
      index: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      index: true,
    },
    locationType: {
      type: String,
      enum: [
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
        COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
      ],
    },
    locationName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    collectionItems: [{
      materialType: {
        type: String,
        enum: MATERIAL_TYPE_ENUM,
        required: true,
      },
      weight: {
        type: Number,
        required: true,
        min: 0.1, // Minimum 0.1 kg
      },
      rate: {
        type: Number,
        required: true,
        min: 0,
      },
      amount: {
        type: Number,
        required: false, // Calculated in pre-save hook from weight * rate
        min: 0,
      },
    }],
    totalWeight: {
      type: Number,
      min: 0,
    },
    subTotal: {
      type: Number,
      min: 0,
    },
    gstRate: {
      type: Number,
      default: FINANCIAL.DEFAULT_GST_RATE,
      min: FINANCIAL.MIN_GST_RATE,
      max: FINANCIAL.MAX_GST_RATE,
    },
    gstAmount: {
      type: Number,
      min: 0,
    },
    totalAmount: {
      type: Number,
      min: 0,
    },
    collectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    collectionDate: {
      type: Date,
      default: Date.now,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined but enforce uniqueness when present
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    quoteAmount: {
      type: Number,
      min: 0,
    },
    quoteDetails: {
      type: String,
      maxlength: 2000,
    },
    estimatedTimeline: {
      type: String,
    },
    quotedAt: {
      type: Date,
    },
    quotedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'quoted', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    milestones: [{
      title: { type: String, required: true },
      description: { type: String },
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
    }],
    attachments: [{
      url: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }],
    notes: [{
      message: { type: String, required: true },
      addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      addedAt: { type: Date, default: Date.now },
      isInternal: { type: Boolean, default: false },
    }],
    modificationHistory: [{
      modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      modifiedAt: { type: Date, default: Date.now },
      action: {
        type: String,
        enum: ['created', 'updated', 'deleted', 'receipt_generated', 'transferred'],
        required: true,
      },
      changes: { type: Schema.Types.Mixed },
      notes: { type: String },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate totals for collections
projectSchema.pre('save', function (next) {
  // Only calculate if this is a recycling collection with items
  if (this.serviceType === 'recycling' && this.collectionItems && this.collectionItems.length > 0) {
    // Calculate amount for each item
    this.collectionItems.forEach((item: CollectionItem) => {
      item.amount = item.weight * item.rate;
    });
    
    // Calculate total weight
    this.totalWeight = this.collectionItems.reduce((sum, item) => sum + item.weight, 0);
    
    // Calculate subtotal
    this.subTotal = this.collectionItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate GST per item based on material type and sum them
    this.gstAmount = this.collectionItems.reduce((sum, item) => {
      const itemGstRate = getGSTRateForMaterial(item.materialType);
      const itemGstAmount = (item.amount * itemGstRate) / 100;
      return sum + itemGstAmount;
    }, 0);
    
    // Calculate weighted average GST rate for display purposes
    if (this.subTotal > 0) {
      this.gstRate = (this.gstAmount / this.subTotal) * 100;
    } else {
      this.gstRate = FINANCIAL.DEFAULT_GST_RATE;
    }
    
    // Calculate total amount
    this.totalAmount = this.subTotal + this.gstAmount;
  }
  next();
});

// Indexes for performance
// Note: serviceType already has index: true in field definition
// Note: receiptNumber has unique: true which automatically creates an index
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ assignedTo: 1 });
projectSchema.index({ priority: 1, status: 1 });
projectSchema.index({ locationType: 1 });
projectSchema.index({ collectedBy: 1, collectionDate: -1 });

// Composite indexes for location-based queries
projectSchema.index({ locationType: 1, locationName: 1 }); // Filter by type and name
projectSchema.index({ 'location.city': 1, locationType: 1 }); // City + type queries
projectSchema.index({ collectionDate: -1, locationType: 1 }); // Recent collections by type
projectSchema.index({ locationName: 1, locationType: 1 }); // Name + type search

// Text search index for $or queries with regex (title, description, location fields)
projectSchema.index({ title: 'text', description: 'text', locationName: 'text' });

// Note: receiptNumber already has unique: true which automatically creates an index
// No need to add separate index for receiptNumber alone

// Compound index for serviceType + status queries
projectSchema.index({ serviceType: 1, status: 1, createdAt: -1 });

// Index for collectionId lookups in receipts
projectSchema.index({ collectionDate: 1, serviceType: 1 });

// Critical compound indexes for common query patterns (HIGH PERFORMANCE)
// Dashboard and analytics queries
projectSchema.index({ serviceType: 1, isDeleted: 1, collectionDate: -1 });
projectSchema.index({ serviceType: 1, isDeleted: 1, createdAt: -1 });
// User-specific queries with soft-delete
projectSchema.index({ userId: 1, isDeleted: 1, collectionDate: -1 });
projectSchema.index({ serviceType: 1, isDeleted: 1, userId: 1, collectionDate: -1 });
// Receipt queries
projectSchema.index({ receiptNumber: 1, isDeleted: 1 });
// CollectedBy queries
projectSchema.index({ collectedBy: 1, isDeleted: 1, collectionDate: -1 });
// Additional indexes for common query patterns
projectSchema.index({ isDeleted: 1, userId: 1, collectionDate: -1 });
projectSchema.index({ isDeleted: 1, collectedBy: 1, collectionDate: -1 });
projectSchema.index({ isDeleted: 1, locationId: 1, collectionDate: -1 });
projectSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);

