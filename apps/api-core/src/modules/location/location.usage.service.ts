import mongoose, { Types, Model } from 'mongoose';
import { Location, ILocation } from './location.model';
import {Project, IProject} from '../project/project.model';
// Note: buildDateRange should be used via QueryBuilderService in NestJS services
// For function-based services, import the service and create an instance
import { QueryBuilderService } from '../../infrastructure/database/query-builder.service';
import { ValidationService } from '../../common/validation/validation.service';


const getLocationModel = (verifiedConnection?: mongoose.Connection): Model<ILocation> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Location.modelName]) {
    return connection.models[Location.modelName] as Model<ILocation>;
  }
  return Location as Model<ILocation>;
};

const getProjectModel = (verifiedConnection?: mongoose.Connection): Model<IProject> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Project.modelName]) {
    return connection.models[Project.modelName] as Model<IProject>;
  }
  return Project as Model<IProject>;
};

// Note: This file uses Express-style imports
// For NestJS, inject LocationService via constructor instead
// Re-export setter for backward compatibility
export { setLocationServiceInstance } from './location.service';

/**
 * Track location usage when a collection is created
 */
export const trackLocationUsage = async (
  locationId: string,
  _userId: string,
  verifiedConnection?: mongoose.Connection
): Promise<void> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');
  await LocationModel.findByIdAndUpdate(
    locationObjectId,
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
    },
    { new: true }
  );
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
, verifiedConnection?: mongoose.Connection): Promise<{
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
  const ProjectModel = getProjectModel(verifiedConnection);
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
    ProjectModel.find(query)
      .populate('collectedBy', 'name email')
      .select('title collectionDate totalAmount collectedBy')
      .sort({ collectionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProjectModel.countDocuments(query),
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
, verifiedConnection?: mongoose.Connection): Promise<Array<{
  _id: string;
  locationName: string;
  address: string;
  city?: string;
  locationType: string;
  lastUsedAt: Date;
}>> => {
  const ProjectModel = getProjectModel(verifiedConnection);
  const collections = await ProjectModel.find({
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

