import mongoose, { Types, Model } from 'mongoose';
import {Location, ILocation} from './location.model';
import { CreateLocationData } from './location.service';
import {Project, IProject} from '../project/project.model';



const getProjectModel = (verifiedConnection?: mongoose.Connection): Model<IProject> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Project.modelName]) {
    return connection.models[Project.modelName] as Model<IProject>;
  }
  return Project as Model<IProject>;
};

const getLocationModel = (verifiedConnection?: mongoose.Connection): Model<ILocation> => {
  const connection = verifiedConnection || mongoose.connection;
  if (connection.models[Location.modelName]) {
    return connection.models[Location.modelName] as Model<ILocation>;
  }
  return Location as Model<ILocation>;
};

export interface BulkCreateResult {
  success: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    locationId?: string;
    error?: string;
  }>;
}

/**
 * Bulk create locations
 */
export const bulkCreateLocations = async (
  locations: CreateLocationData[],
  createdBy: string
, verifiedConnection?: mongoose.Connection): Promise<BulkCreateResult> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const results: BulkCreateResult['results'] = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < locations.length; i++) {
    try {
      const locationData = locations[i] as CreateLocationData & { lastUsedAt?: Date; createdAt?: Date };

      // Check for duplicate location before creating
      // Duplicate is defined as: same locationType, locationName (case-insensitive), and address (case-insensitive)
      const normalizedLocationName = locationData.locationName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedAddress = locationData.address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingLocation = await LocationModel.findOne({
        locationType: locationData.locationType,
        locationName: { $regex: new RegExp(`^${normalizedLocationName}$`, 'i') },
        address: { $regex: new RegExp(`^${normalizedAddress}$`, 'i') },
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });

      if (existingLocation) {
        results.push({
          index: i,
          success: false,
          error: `Duplicate location: A location with the same type, name, and address already exists (ID: ${existingLocation._id})`,
        });
        failed++;
        continue;
      }

      const location = new LocationModel({
        locationType: locationData.locationType,
        locationName: locationData.locationName,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        zipCode: locationData.zipCode,
        tags: locationData.tags,
        group: locationData.group,
        notes: locationData.notes,
        lastUsedAt: locationData.lastUsedAt,
        createdBy: new Types.ObjectId(createdBy),
      });

      // If createdAt was provided, set it explicitly before save
      if (locationData.createdAt) {
        location.createdAt = locationData.createdAt;
      }

      const saved = await location.save();
      results.push({
        index: i,
        success: true,
        locationId: saved._id.toString(),
      });
      success++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create location';
      results.push({
        index: i,
        success: false,
        error: errorMessage,
      });
      failed++;
    }
  }

  return { success, failed, results };
};

/**
 * Bulk update locations
 */
export const bulkUpdateLocations = async (
  updates: Array<{ id: string; data: Partial<CreateLocationData & { isActive?: boolean }> }>
, verifiedConnection?: mongoose.Connection): Promise<{
  success: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const update of updates) {
    try {
      const location = await LocationModel.findById(update.id);
      if (!location || location.isDeleted) {
        results.push({
          id: update.id,
          success: false,
          error: 'Location not found',
        });
        failed++;
        continue;
      }

      Object.assign(location, update.data);
      await location.save();
      results.push({
        id: update.id,
        success: true,
      });
      success++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
      results.push({
        id: update.id,
        success: false,
        error: errorMessage,
      });
      failed++;
    }
  }

  return { success, failed, results };
};

/**
 * Bulk delete locations (soft delete)
 */
export const bulkDeleteLocations = async (
  ids: string[]
, verifiedConnection?: mongoose.Connection): Promise<{
  success: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}> => {
  const LocationModel = getLocationModel(verifiedConnection);
  const ProjectModel = getProjectModel(verifiedConnection);
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      const location = await LocationModel.findById(id);
      if (!location || location.isDeleted) {
        results.push({
          id,
          success: false,
          error: 'Location not found',
        });
        failed++;
        continue;
      }

      // Check if location has any collections (usage count)
      const collectionCount = await ProjectModel.countDocuments({
        locationId: new Types.ObjectId(id),
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      });

      if (collectionCount > 0) {
        results.push({
          id,
          success: false,
          error: `Location has ${collectionCount} collection(s). Locations with collections can only be deactivated.`,
        });
        failed++;
        continue;
      }

      // Soft delete - also deactivate location when soft deleted
      location.isDeleted = true;
      location.deletedAt = new Date();
      location.isActive = false;
      await location.save();
      results.push({
        id,
        success: true,
      });
      success++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete location';
      results.push({
        id,
        success: false,
        error: errorMessage,
      });
      failed++;
    }
  }

  return { success, failed, results };
};

/**
 * Validate bulk locations before import
 */
export const validateBulkLocations = (
  locations: CreateLocationData[]
): {
  valid: boolean;
  errors: Array<{ index: number; field: string; message: string }>;
} => {
  const errors: Array<{ index: number; field: string; message: string }> = [];

  locations.forEach((location, index) => {
    if (!location.locationType) {
      errors.push({ index, field: 'locationType', message: 'Location type is required' });
    }
    if (!location.locationName || location.locationName.trim().length < 2) {
      errors.push({ index, field: 'locationName', message: 'Location name must be at least 2 characters' });
    }
    if (!location.address || location.address.trim().length < 5) {
      errors.push({ index, field: 'address', message: 'Address must be at least 5 characters' });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

