import { z } from 'zod';
import { COLLECTION_LOCATION_TYPES, normalizeLocationName, MATERIAL_TYPE_ENUM } from '../../types/collections';

// Collection item schema
const collectionItemSchema = z.object({
  materialType: z.enum(MATERIAL_TYPE_ENUM),
  weight: z.number().min(0.1, 'Weight must be at least 0.1 kg'),
  rate: z.number().min(0, 'Rate must be positive'),
});

export const createProjectSchema = z.object({
  serviceType: z.enum(['recycling', 'cctv', 'access-control', 'fire-safety', 'networking', 'home-automation', 'other']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  location: z.object({
    address: z.string().min(5, 'Address is required'),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  // Collection-specific fields
  locationId: z.string().optional(), // Reference to registered Location
  locationType: z.enum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
  ] as [string, ...string[]], {
    errorMap: () => ({
      message: `Location type must be one of: ${Object.values(COLLECTION_LOCATION_TYPES).join(', ')}`,
    }),
  }).optional(),
  locationName: z.string()
    .min(2, 'Location name must be at least 2 characters')
    .max(200, 'Location name must not exceed 200 characters')
    .regex(
      /^[A-Za-z0-9\s\-'.,&()]+$/,
      'Location name can only contain letters, numbers, spaces, and common punctuation'
    )
    .transform((val) => normalizeLocationName(val))
    .optional(),
  collectionItems: z.array(collectionItemSchema).min(1, 'At least one collection item is required').optional(),
  gstRate: z.number().min(0).max(100).optional(),
  collectionDate: z.coerce.date().optional(),
}).refine((data) => {
  // If serviceType is recycling, locationId OR (locationType + locationName) and collectionItems are required
  if (data.serviceType === 'recycling') {
    // If locationId is provided, that's sufficient
    if (data.locationId) {
      // Still need collectionItems
      if (!data.collectionItems || data.collectionItems.length === 0) {
        return false;
      }
      return true;
    }
    
    // Otherwise, need locationType and locationName
    if (!data.locationType) {
      return false;
    }
    const locationName = data.locationName;
    if (!locationName || (typeof locationName === 'string' && locationName.trim().length < 2)) {
      return false;
    }
    if (!data.collectionItems || data.collectionItems.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'Either locationId or (locationType + locationName) and collection items are required for recycling collections',
  path: ['locationType'],
}).refine((data) => {
  // If locationType is provided (and no locationId), locationName should also be provided
  if (data.locationType && !data.locationId) {
    const locationName = data.locationName;
    if (!locationName || (typeof locationName === 'string' && locationName.trim().length < 2)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Location name is required when location type is specified (and locationId is not provided)',
  path: ['locationName'],
});

export const updateProjectSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  location: z.object({
    address: z.string().min(5),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'quoted', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled']).optional(),
  // Collection-specific fields
  locationId: z.string().nullable().optional(), // Reference to registered Location (can be set to null to switch to manual entry)
  locationType: z.enum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
  ] as [string, ...string[]]).optional(),
  locationName: z.string()
    .min(2, 'Location name must be at least 2 characters')
    .max(200, 'Location name must not exceed 200 characters')
    .regex(
      /^[A-Za-z0-9\s\-'.,&()]+$/,
      'Location name can only contain letters, numbers, spaces, and common punctuation'
    )
    .transform((val) => normalizeLocationName(val))
    .optional(),
  collectionItems: z.array(collectionItemSchema).min(1).optional(),
  gstRate: z.number().min(0).max(100).optional(),
  collectionDate: z.coerce.date().optional(),
});

export const sendQuoteSchema = z.object({
  quoteAmount: z.number().min(0, 'Quote amount must be positive'),
  quoteDetails: z.string().min(10, 'Quote details are required').max(2000).optional(),
  estimatedTimeline: z.string().optional(),
});

export const acceptQuoteSchema = z.object({
  notes: z.string().optional(),
});

export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  notes: z.string().optional(),
});

export const addMilestoneSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
});

export const addNoteSchema = z.object({
  message: z.string().min(1).max(2000),
  isInternal: z.boolean().optional(),
});

