import {
  ILocationItemTypeRate,
  LocationItemTypeRate,
  LOCATION_ITEM_TYPE_RATE_MODEL_NAME,
  LocationItemTypeRateSchema,
} from './location.rate.model';
import { Location, ILocation } from './location.model';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ValidationService } from '../../common/validation/validation.service';
import { isValidMaterialType, MaterialType } from '../../types/collections';
import mongoose, { Model } from 'mongoose';

/**
 * Get Location model from the verified connection
 * 
 * @param verifiedConnection - Optional verified connection instance from DatabaseService
 */
const getLocationModel = (verifiedConnection?: mongoose.Connection): Model<ILocation> => {
  // If a verified connection is provided, use it (this ensures we use the same connection that was verified)
  const connection = verifiedConnection || mongoose.connection;
  
  // Get or create the model from the connection
  if (connection.models.Location) {
    return connection.models.Location as Model<ILocation>;
  }
  // Fallback to the exported Location model (uses default connection)
  return Location as Model<ILocation>;
};

/**
 * Get LocationItemTypeRate model from the verified connection.
 * Using the verified connection prevents Mongoose buffering timeouts when the
 * default connection isn't ready.
 */
const getLocationItemTypeRateModel = (
  verifiedConnection?: mongoose.Connection,
): Model<ILocationItemTypeRate> => {
  const connection = verifiedConnection || mongoose.connection;

  const existing = connection.models[LOCATION_ITEM_TYPE_RATE_MODEL_NAME];
  if (existing) {
    return existing as Model<ILocationItemTypeRate>;
  }

  return connection.model<ILocationItemTypeRate>(
    LOCATION_ITEM_TYPE_RATE_MODEL_NAME,
    LocationItemTypeRateSchema,
  );
};

/**
 * Get all active rates for a location
 */
export const getLocationItemTypeRates = async (
  locationId: string,
  verifiedConnection?: mongoose.Connection
): Promise<ILocationItemTypeRate[]> => {
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');

  // Get Location model from verified connection
  const LocationModel = getLocationModel(verifiedConnection);
  const LocationItemTypeRateModel = getLocationItemTypeRateModel(verifiedConnection);

  // Validate location exists and is not deleted (check both isDeleted and deletedAt)
  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new NotFoundException('Location not found');
  }

  const rates = await LocationItemTypeRateModel.find({
    locationId: locationObjectId,
    isActive: true,
  })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ materialType: 1 });

  return rates;
};

/**
 * Set or update a rate for a location and material type
 */
export const setLocationItemTypeRate = async (
  locationId: string,
  materialType: string,
  rate: number,
  userId: string,
  verifiedConnection?: mongoose.Connection
): Promise<ILocationItemTypeRate> => {
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');
  const userObjectId = validationService.validateObjectId(userId, 'userId');

  const LocationModel = getLocationModel(verifiedConnection);
  const LocationItemTypeRateModel = getLocationItemTypeRateModel(verifiedConnection);

  // Validate material type
  if (!isValidMaterialType(materialType)) {
    throw new BadRequestException(`Invalid material type: ${materialType}`);
  }

  // Validate rate
  if (rate < 0) {
    throw new BadRequestException('Rate must be non-negative');
  }

  // Validate location exists and is not deleted (check both isDeleted and deletedAt)
  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new NotFoundException('Location not found');
  }

  // Find existing rate (active or inactive)
  let existingRate = await LocationItemTypeRateModel.findOne({
    locationId: locationObjectId,
    materialType: materialType as MaterialType,
  });

  if (existingRate) {
    // Update existing rate
    existingRate.rate = rate;
    existingRate.isActive = true;
    existingRate.updatedBy = userObjectId;
    await existingRate.save();
    return existingRate;
  } else {
    // Create new rate
    const newRate = new LocationItemTypeRateModel({
      locationId: locationObjectId,
      materialType: materialType as MaterialType,
      rate,
      isActive: true,
      createdBy: userObjectId,
      updatedBy: userObjectId,
    });
    await newRate.save();
    return newRate;
  }
};

/**
 * Bulk set rates for a location
 */
export const bulkSetLocationItemTypeRates = async (
  locationId: string,
  rates: Array<{ materialType: string; rate: number }>,
  userId: string,
  verifiedConnection?: mongoose.Connection
): Promise<{ success: number; failed: number; results: Array<{ materialType: string; success: boolean; error?: string }> }> => {
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');
  validationService.validateObjectId(userId, 'userId');

  const LocationModel = getLocationModel(verifiedConnection);

  // Validate location exists and is not deleted (check both isDeleted and deletedAt)
  const location = await LocationModel.findOne({
    _id: locationObjectId,
    isDeleted: { $ne: true },
    deletedAt: { $exists: false },
  });
  if (!location) {
    throw new NotFoundException('Location not found');
  }

  const results: Array<{ materialType: string; success: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const { materialType, rate } of rates) {
    try {
      await setLocationItemTypeRate(locationId, materialType, rate, userId, verifiedConnection);
      results.push({ materialType, success: true });
      success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set rate';
      results.push({ materialType, success: false, error: errorMessage });
      failed++;
    }
  }

  return { success, failed, results };
};

/**
 * Get rate for a specific location and material type
 * Returns null if not set
 */
export const getRateForLocationAndMaterial = async (
  locationId: string,
  materialType: string
): Promise<number | null> => {
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');

  if (!isValidMaterialType(materialType)) {
    return null;
  }

  const rate = await LocationItemTypeRate.findOne({
    locationId: locationObjectId,
    materialType: materialType as MaterialType,
    isActive: true,
  });

  return rate ? rate.rate : null;
};

/**
 * Delete (deactivate) a rate for a location and material type
 */
export const deleteLocationItemTypeRate = async (
  locationId: string,
  materialType: string
): Promise<void> => {
  const validationService = new ValidationService();
  const locationObjectId = validationService.validateObjectId(locationId, 'locationId');

  if (!isValidMaterialType(materialType)) {
    throw new BadRequestException(`Invalid material type: ${materialType}`);
  }

  const rate = await LocationItemTypeRate.findOne({
    locationId: locationObjectId,
    materialType: materialType as MaterialType,
    isActive: true,
  });

  if (!rate) {
    throw new NotFoundException('Rate not found');
  }

  rate.isActive = false;
  await rate.save();
};

/**
 * Get rates for multiple locations
 */
export const getRatesForLocations = async (
  locationIds: string[]
): Promise<Record<string, ILocationItemTypeRate[]>> => {
  const validationService = new ValidationService();
  const locationObjectIds = locationIds.map(id => validationService.validateObjectId(id, 'locationId'));

  const rates = await LocationItemTypeRate.find({
    locationId: { $in: locationObjectIds },
    isActive: true,
  })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ locationId: 1, materialType: 1 });

  // Group by locationId
  const grouped: Record<string, ILocationItemTypeRate[]> = {};
  for (const rate of rates) {
    const locId = rate.locationId.toString();
    if (!grouped[locId]) {
      grouped[locId] = [];
    }
    grouped[locId].push(rate);
  }

  return grouped;
};

/**
 * Get all location rates (with pagination/filtering)
 */
export const getAllLocationRates = async (filters?: {
  locationId?: string;
  materialType?: string;
  page?: number;
  limit?: number;
}): Promise<{
  rates: ILocationItemTypeRate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  const query: Record<string, unknown> = { isActive: true };

  if (filters?.locationId) {
    query.locationId = filters.locationId;
  }

  if (filters?.materialType) {
    query.materialType = filters.materialType;
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const [rates, total] = await Promise.all([
    LocationItemTypeRate.find(query)
      .populate('locationId', 'locationName address city state locationType')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ locationId: 1, materialType: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LocationItemTypeRate.countDocuments(query),
  ]);

  return {
    rates: rates as unknown as ILocationItemTypeRate[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get location rates (wrapper for getLocationItemTypeRates)
 */
export const getLocationRates = async (locationId: string, verifiedConnection?: mongoose.Connection): Promise<ILocationItemTypeRate[]> => {
  return getLocationItemTypeRates(locationId, verifiedConnection);
};

/**
 * Set location rates (wrapper for bulkSetLocationItemTypeRates)
 */
export const setLocationRates = async (
  locationId: string,
  rates: Array<{ materialType: string; rate: number }>,
  userId?: string,
  verifiedConnection?: mongoose.Connection,
): Promise<{ success: number; failed: number }> => {
  return bulkSetLocationItemTypeRates(locationId, rates, userId || 'system', verifiedConnection);
};
