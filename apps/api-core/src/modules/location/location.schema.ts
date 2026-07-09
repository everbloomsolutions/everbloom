import { z } from 'zod';
import { COLLECTION_LOCATION_TYPES, normalizeLocationName } from '../../types/collections';

export const createLocationSchema = z.object({
  locationType: z.enum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
  ] as [string, ...string[]], {
    errorMap: () => ({
      message: `Location type must be one of: ${Object.values(COLLECTION_LOCATION_TYPES).join(', ')}`,
    }),
  }),
  locationName: z.string()
    .min(2, 'Location name must be at least 2 characters')
    .max(200, 'Location name must not exceed 200 characters')
    .regex(
      /^[A-Za-z0-9\s\-'.,&()]+$/,
      'Location name can only contain letters, numbers, spaces, and common punctuation'
    )
    .transform((val) => normalizeLocationName(val)),
  locality: z.string()
    .min(2, 'Locality must be at least 2 characters')
    .max(200, 'Locality must not exceed 200 characters')
    .trim(),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must not exceed 500 characters')
    .trim(),
  city: z.string()
    .max(100, 'City must not exceed 100 characters')
    .trim()
    .optional(),
  state: z.string()
    .max(100, 'State must not exceed 100 characters')
    .trim()
    .optional(),
  zipCode: z.string()
    .max(20, 'Zip code must not exceed 20 characters')
    .regex(/^[A-Za-z0-9\s-]+$/, 'Invalid zip code format')
    .trim()
    .optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  tags: z.array(z.string().trim()).optional(),
  group: z.string().max(50).trim().optional(),
  notes: z.string().max(2000).optional(),
  assignToUserId: z.string().optional(),
});

export const updateLocationSchema = z.object({
  locationType: z.enum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
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
  locality: z.string()
    .min(2, 'Locality must be at least 2 characters')
    .max(200, 'Locality must not exceed 200 characters')
    .trim()
    .optional(),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must not exceed 500 characters')
    .trim()
    .optional(),
  city: z.string()
    .max(100, 'City must not exceed 100 characters')
    .trim()
    .optional(),
  state: z.string()
    .max(100, 'State must not exceed 100 characters')
    .trim()
    .optional(),
  zipCode: z.string()
    .max(20, 'Zip code must not exceed 20 characters')
    .regex(/^[A-Za-z0-9\s-]+$/, 'Invalid zip code format')
    .trim()
    .optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string().trim()).optional(),
  group: z.string().max(50).trim().optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const searchLocationSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  limit: z.number().min(1).max(50).optional().default(10),
});

export const locationFiltersSchema = z.object({
  locationType: z.enum([
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_APARTMENT,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_SOCIETY,
    COLLECTION_LOCATION_TYPES.RESIDENTIAL_GATED_COMMUNITY,
    COLLECTION_LOCATION_TYPES.COMMERCIAL_PROPERTY,
  ] as [string, ...string[]]).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  minUsageCount: z.number().min(0).optional(),
  maxUsageCount: z.number().min(0).optional(),
  lastUsedBefore: z.date().optional(),
  lastUsedAfter: z.date().optional(),
  tags: z.array(z.string()).optional(),
  group: z.string().optional(),
  sortBy: z.enum(['mostUsed', 'recentlyUsed', 'alphabetical', 'newest']).optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

