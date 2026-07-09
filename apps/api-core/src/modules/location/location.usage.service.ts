import { Types } from 'mongoose';
import { Project } from '../project/project.model';
import { getLocationServiceInstance } from './location.service';
// Note: buildDateRange should be used via QueryBuilderService in NestJS services
// For function-based services, import the service and create an instance
import { QueryBuilderService } from '../../infrastructure/database/query-builder.service';

// Note: This file uses Express-style imports
// For NestJS, inject LocationService via constructor instead
// Re-export setter for backward compatibility
export { setLocationServiceInstance } from './location.service';

/**
 * Track location usage when a collection is created
 */
export const trackLocationUsage = async (
  locationId: string,
  _userId: string
): Promise<void> => {
  // Increment usage count and update lastUsedAt
  try {
    const locationServiceInstance = getLocationServiceInstance();
    await locationServiceInstance.incrementUsage(locationId);
  } catch (_error) {
    // Note: This won't work without DI - needs refactoring
    throw new Error('LocationService instance not set. Use NestJS DI instead.');
  }
};

/**
 * Get usage history for a location
 */
export const getUsageHistory = async (
  locationId: string,
  filters?: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  collections: Array<{
    _id: string;
    title: string;
    collectionDate: Date;
    totalAmount: number;
    collectedBy?: {
      _id: string;
      name: string;
      email: string;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const { page = 1, limit = 20, startDate, endDate } = filters || {};
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    locationId: new Types.ObjectId(locationId),
  };

  // Use QueryBuilderService for consistent date filtering
  const queryBuilder = new QueryBuilderService();
  const dateRangeFilter = queryBuilder.buildDateRange(startDate, endDate, 'collectionDate');
  Object.assign(query, dateRangeFilter);

  const [collections, total] = await Promise.all([
    Project.find(query)
      .populate('collectedBy', 'name email')
      .select('title collectionDate totalAmount collectedBy')
      .sort({ collectionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(query),
  ]);

  interface CollectionLean {
    _id: Types.ObjectId;
    title: string;
    collectionDate?: Date;
    createdAt: Date;
    totalAmount?: number;
    collectedBy?: {
      _id: Types.ObjectId;
      name?: string;
      email?: string;
    } | null;
  }

  return {
    collections: collections.map((col: CollectionLean) => ({
      _id: col._id.toString(),
      title: col.title,
      collectionDate: col.collectionDate || col.createdAt,
      totalAmount: col.totalAmount || 0,
      collectedBy: col.collectedBy ? {
        _id: col.collectedBy._id.toString(),
        name: col.collectedBy.name || '',
        email: col.collectedBy.email || '',
      } : undefined,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get locations recently used by a user
 */
export const getUserRecentLocations = async (
  userId: string,
  limit: number = 5
): Promise<Array<{
  _id: string;
  locationName: string;
  address: string;
  city?: string;
  locationType: string;
  lastUsedAt: Date;
}>> => {
  const collections = await Project.find({
    locationId: { $exists: true, $ne: null },
    collectedBy: new Types.ObjectId(userId),
  })
    .populate('locationId', 'locationName address city locationType')
    .select('locationId collectionDate')
    .sort({ collectionDate: -1, createdAt: -1 })
    .limit(limit * 2) // Get more to filter unique
    .lean();

  interface CollectionWithLocation {
    _id: Types.ObjectId;
    collectionDate?: Date;
    createdAt: Date;
    locationId?: {
      _id: Types.ObjectId;
      locationName?: string;
      address?: string;
      city?: string;
      locationType?: string;
    } | null;
  }

  // Get unique locations with most recent usage
  const locationMap = new Map<string, {
    _id: string;
    locationName: string;
    address: string;
    city?: string;
    locationType: string;
    lastUsedAt: Date;
  }>();
  collections.forEach((col: CollectionWithLocation) => {
    if (col.locationId && !locationMap.has(col.locationId._id.toString())) {
      locationMap.set(col.locationId._id.toString(), {
        _id: col.locationId._id.toString(),
        locationName: col.locationId.locationName || '',
        address: col.locationId.address || '',
        city: (col.locationId.city || '') as string,
        locationType: col.locationId.locationType as string,
        lastUsedAt: col.collectionDate || col.createdAt,
      });
    }
  });

  return Array.from(locationMap.values()).slice(0, limit).map(loc => ({
    ...loc,
    locationName: loc.locationName || '',
    address: loc.address || '',
    city: (loc.city || '') as string,
  }));
};

