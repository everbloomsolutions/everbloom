import { BadRequestException, Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Location, LocationDocument } from './schemas/location.schema';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { ValidationService } from '../../common/validation/validation.service';
import { PaginationService } from '../../common/pagination/pagination.service';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { PAGINATION } from '../../config/constants';
import { CollectionLocationType } from '../../types/collections';

// Export type for use in other service files
export interface CreateLocationData {
  locationType: CollectionLocationType;
  locationName: string;
  locality: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  tags?: string[];
  group?: string;
  notes?: string;
}

// Import original Express service functions dynamically
let expressLocationService: any;

async function getExpressService() {
  if (!expressLocationService) {
    try {
      // Try to import Express service functions from location.model.ts or other files
      // Note: This is a wrapper that delegates to Express service if available
      expressLocationService = await import('./location.model');
    } catch (_error) {
      expressLocationService = null;
    }
  }
  return expressLocationService;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @Inject(ValidationService) private validationService: ValidationService,
    @Inject(PaginationService) private paginationService: PaginationService,
    @Inject(DatabaseService) private databaseService: DatabaseService,
  ) {}

  async createLocation(data: CreateLocationDto, createdBy: string): Promise<LocationDocument> {
    const expressService = await getExpressService();
    if (expressService && expressService.createLocation) {
      return expressService.createLocation(data, createdBy) as any;
    }

    // Native Nest implementation (fail-safe fallback)
    await this.databaseService.ensureConnectionReady();
    const createdByObjectId = this.validationService.validateObjectId(createdBy, 'createdBy');

    const doc = new this.locationModel({
      ...data,
      locationName: data.locationName?.trim(),
      locality: data.locality?.trim(),
      address: data.address?.trim(),
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      zipCode: data.zipCode?.trim() || undefined,
      createdBy: createdByObjectId,
      isActive: true,
      isDeleted: false,
      deletedAt: undefined,
    });

    try {
      const saved = await doc.save();
      return saved;
    } catch (error: any) {
      // Unique index violation
      if (error?.code === 11000) {
        throw new BadRequestException('A location with the same type/name/locality/address already exists');
      }
      this.logger.error('Failed to create location', error);
      throw error;
    }
  }

  async getLocations(filters: LocationQueryDto = {}): Promise<{
    locations: LocationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const validatedPage = this.paginationService.validatePage(filters.page, 1);
    const validatedLimit = this.paginationService.validateLimit(
      filters.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );
    const skip = this.paginationService.calculateSkip(validatedPage, validatedLimit);

    // Build filter query - use consistent deletion check pattern
    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    if (filters.locationType) {
      filter.locationType = filters.locationType;
    }

    if (filters.city) {
      filter.city = { $regex: filters.city, $options: 'i' };
    }

    if (filters.state) {
      filter.state = { $regex: filters.state, $options: 'i' };
    }

    if (filters.isActive !== undefined) {
      filter.isActive = filters.isActive;
    }

    if (filters.search) {
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch.length >= 1) {
        // Escape special regex characters to prevent regex injection
        const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        
        // Use $or with regex for better partial matching across multiple fields
        // This is more flexible than $text search and works better for short queries
        filter.$or = [
          { locationName: { $regex: searchRegex } },
          { locality: { $regex: searchRegex } },
          { address: { $regex: searchRegex } },
          { city: { $regex: searchRegex } },
          { state: { $regex: searchRegex } },
          { zipCode: { $regex: searchRegex } },
        ];
      }
    }

    if (filters.minUsageCount !== undefined) {
      filter.usageCount = { ...(filter.usageCount as Record<string, unknown> || {}), $gte: filters.minUsageCount };
    }

    if (filters.maxUsageCount !== undefined) {
      filter.usageCount = { ...(filter.usageCount as Record<string, unknown> || {}), $lte: filters.maxUsageCount };
    }

    if (filters.lastUsedBefore) {
      filter.lastUsedAt = { ...(filter.lastUsedAt as Record<string, unknown> || {}), $lte: new Date(filters.lastUsedBefore) };
    }

    if (filters.lastUsedAfter) {
      filter.lastUsedAt = { ...(filter.lastUsedAt as Record<string, unknown> || {}), $gte: new Date(filters.lastUsedAfter) };
    }

    if (filters.tags && filters.tags.length > 0) {
      filter.tags = { $in: filters.tags };
    }

    if (filters.group) {
      filter.group = filters.group;
    }

    if (filters.assignedToAgent) {
      const agentObjectId = this.validationService.validateObjectId(filters.assignedToAgent, 'assignedToAgent');
      filter.assignedToAgent = agentObjectId;
    }

    if (filters.unassigned === true) {
      filter.assignedToAgent = { $exists: false };
    }

    // Build sort
    let sort: Record<string, 1 | -1> = { createdAt: -1 }; // Default: newest first
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'mostUsed':
          sort = { usageCount: -1, lastUsedAt: -1 };
          break;
        case 'recentlyUsed':
          sort = { lastUsedAt: -1, usageCount: -1 };
          break;
        case 'alphabetical':
          sort = { locationName: 1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
      }
    }

    const [locations, total] = await Promise.all([
      this.locationModel
        .find(filter)
        .populate('createdBy', 'name email')
        .populate('assignedToAgent', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(validatedLimit)
        .exec(),
      this.locationModel.countDocuments(filter),
    ]);

    return {
      locations,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: this.paginationService.calculateTotalPages(total, validatedLimit),
    };
  }

  async getLocationById(locationId: string): Promise<LocationDocument> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');

    const location = await this.locationModel
      .findOne({
        _id: locationObjectId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
      .populate('createdBy', 'name email')
      .populate('assignedToAgent', 'name email')
      .exec();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async updateLocation(locationId: string, data: UpdateLocationDto, updatedBy: string): Promise<LocationDocument> {
    const expressService = await getExpressService();
    if (expressService && expressService.updateLocation) {
      return expressService.updateLocation(locationId, data, updatedBy) as any;
    }

    await this.databaseService.ensureConnectionReady();
    this.validationService.validateObjectId(updatedBy, 'updatedBy');
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');

    const location = await this.locationModel.findOne({
      _id: locationObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (data.locationType !== undefined) location.locationType = data.locationType;
    if (data.locationName !== undefined) location.locationName = data.locationName.trim();
    if (data.locality !== undefined) location.locality = data.locality.trim();
    if (data.address !== undefined) location.address = data.address.trim();
    if (data.city !== undefined) location.city = data.city?.trim() || undefined;
    if (data.state !== undefined) location.state = data.state?.trim() || undefined;
    if (data.zipCode !== undefined) location.zipCode = data.zipCode?.trim() || undefined;
    if (data.coordinates !== undefined) location.coordinates = data.coordinates as any;
    if (data.isActive !== undefined) location.isActive = data.isActive;
    if (data.tags !== undefined) location.tags = data.tags;
    if (data.group !== undefined) location.group = data.group?.trim() || undefined;
    if (data.notes !== undefined) location.notes = data.notes;

    try {
      return await location.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('A location with the same type/name/locality/address already exists');
      }
      this.logger.error('Failed to update location', error);
      throw error;
    }
  }

  async deleteLocation(locationId: string): Promise<void> {
    const expressService = await getExpressService();
    if (expressService && expressService.deleteLocation) {
      await expressService.deleteLocation(locationId);
      return;
    }

    await this.databaseService.ensureConnectionReady();
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');

    const location = await this.locationModel.findOne({
      _id: locationObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Soft delete (consistent with other parts of the codebase)
    location.isDeleted = true;
    location.deletedAt = new Date();
    location.isActive = false;
    await location.save();
  }

  async searchLocations(query: string, limit?: number, agentId?: string): Promise<LocationDocument[]> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    const searchLimit = limit || 10;
    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    // Filter by agent if provided
    if (agentId) {
      const agentObjectId = this.validationService.validateObjectId(agentId, 'agentId');
      filter.assignedToAgent = agentObjectId;
    }

    // Build search query - search in locationName, address, city, state, locality, zipCode
    if (query && query.trim()) {
      const trimmedQuery = query.trim();
      
      // Minimum query length validation (at least 1 character)
      if (trimmedQuery.length < 1) {
        return [];
      }

      // Escape special regex characters to prevent regex injection
      const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQuery, 'i');
      
      // Search in multiple fields with priority:
      // 1. locationName (highest priority - exact matches first)
      // 2. locality
      // 3. address
      // 4. city
      // 5. state
      // 6. zipCode
      filter.$or = [
        { locationName: { $regex: searchRegex } },
        { locality: { $regex: searchRegex } },
        { address: { $regex: searchRegex } },
        { city: { $regex: searchRegex } },
        { state: { $regex: searchRegex } },
        { zipCode: { $regex: searchRegex } },
      ];
    }

    // Search locations with limit and improved sorting
    // Sort by: 1) locationName matches first, 2) then alphabetical
    const locations = await this.locationModel
      .find(filter)
      .select('locationName address city state locality zipCode locationType isActive assignedToAgent')
      .populate('assignedToAgent', 'name email')
      .limit(searchLimit)
      .sort({ 
        // Prioritize locationName matches, then alphabetical
        locationName: 1,
        locality: 1,
      })
      .exec();

    // Post-process to rank results: exact/prefix matches in locationName first
    if (query && query.trim()) {
      const trimmedQuery = query.trim().toLowerCase();
      const queryWords = trimmedQuery.split(/\s+/);
      
      return locations.sort((a, b) => {
        const aName = (a.locationName || '').toLowerCase();
        const bName = (b.locationName || '').toLowerCase();
        
        // Exact match gets highest priority
        if (aName === trimmedQuery && bName !== trimmedQuery) return -1;
        if (bName === trimmedQuery && aName !== trimmedQuery) return 1;
        
        // Starts with query gets second priority
        if (aName.startsWith(trimmedQuery) && !bName.startsWith(trimmedQuery)) return -1;
        if (bName.startsWith(trimmedQuery) && !aName.startsWith(trimmedQuery)) return 1;
        
        // Contains all words gets third priority
        const aHasAllWords = queryWords.every(word => aName.includes(word));
        const bHasAllWords = queryWords.every(word => bName.includes(word));
        if (aHasAllWords && !bHasAllWords) return -1;
        if (bHasAllWords && !aHasAllWords) return 1;
        
        // Default: alphabetical
        return aName.localeCompare(bName);
      });
    }

    return locations;
  }

  async getLocationWithStats(locationId: string): Promise<any> {
    const expressService = await getExpressService();
    if (expressService && expressService.getLocationWithStats) {
      return expressService.getLocationWithStats(locationId);
    }

    await this.databaseService.ensureConnectionReady();
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');

    const location = await this.locationModel
      .findOne({
        _id: locationObjectId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
      .populate('createdBy', 'name email')
      .populate('assignedToAgent', 'name email')
      .lean()
      .exec();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Avoid a hard dependency on ProjectModule injection; use already-registered mongoose model.
    const ProjectModel = this.locationModel.db.model('Project');
    const collectionsCount = await ProjectModel.countDocuments({
      locationId: new Types.ObjectId(locationId),
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    });

    const recentCollections = await ProjectModel.find({
      locationId: new Types.ObjectId(locationId),
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    })
      .select('title collectionDate')
      .sort({ collectionDate: -1, createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      ...location,
      collectionsCount,
      recentCollections,
    };
  }

  async getLocationStats(): Promise<any> {
    const expressService = await getExpressService();
    if (expressService && expressService.getLocationStats) {
      return expressService.getLocationStats();
    }

    await this.databaseService.ensureConnectionReady();

    const baseFilter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    const [total, active, inactive] = await Promise.all([
      this.locationModel.countDocuments(baseFilter),
      this.locationModel.countDocuments({ ...baseFilter, isActive: true }),
      this.locationModel.countDocuments({ ...baseFilter, isActive: false }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

  async getLocationAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
    locationType?: string;
    userId?: string;
    userRole?: string;
  }): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalUsage: number;
    averageUsage: number;
    byType: Record<string, number>;
  }> {
    // Build base filter
    const baseFilter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    // Apply date filters (if locations were created/updated in date range)
    if (filters?.startDate || filters?.endDate) {
      baseFilter.createdAt = {};
      if (filters.startDate) {
        (baseFilter.createdAt as Record<string, unknown>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (baseFilter.createdAt as Record<string, unknown>).$lte = filters.endDate;
      }
    }

    // Apply location type filter
    if (filters?.locationType) {
      baseFilter.locationType = filters.locationType;
    }

    // Role-based filtering: agents only see their assigned locations
    if (filters?.userRole === 'agent' && filters?.userId) {
      const agentObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseFilter.assignedToAgent = agentObjectId;
    }

    // Use aggregation pipeline for efficient analytics calculation
    const pipeline = [
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
          },
          totalUsage: { $sum: { $ifNull: ['$usageCount', 0] } },
          byType: {
            $push: {
              type: '$locationType',
              usage: { $ifNull: ['$usageCount', 0] },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          inactive: 1,
          totalUsage: 1,
          averageUsage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $divide: ['$totalUsage', '$total'] },
              0,
            ],
          },
          byType: 1,
        },
      },
    ];

    const result = await this.locationModel.aggregate(pipeline).exec();

    if (result.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        totalUsage: 0,
        averageUsage: 0,
        byType: {},
      };
    }

    const analytics = result[0];

    // Transform byType array into object
    const byTypeObj: Record<string, number> = {};
    if (Array.isArray(analytics.byType)) {
      analytics.byType.forEach((item: { type: string; usage: number }) => {
        const type = item.type || 'Unknown';
        byTypeObj[type] = (byTypeObj[type] || 0) + 1; // Count locations by type
      });
    }

    return {
      total: analytics.total || 0,
      active: analytics.active || 0,
      inactive: analytics.inactive || 0,
      totalUsage: analytics.totalUsage || 0,
      averageUsage: analytics.averageUsage || 0,
      byType: byTypeObj,
    };
  }

  async getDeletedLocations(filters?: any): Promise<any> {
    const expressService = await getExpressService();
    if (expressService && expressService.getDeletedLocations) {
      return expressService.getDeletedLocations(filters);
    }

    await this.databaseService.ensureConnectionReady();
    const page = this.paginationService.validatePage(filters?.page, 1);
    const limit = this.paginationService.validateLimit(
      filters?.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );
    const skip = this.paginationService.calculateSkip(page, limit);

    const query: Record<string, unknown> = {
      isDeleted: true,
      deletedAt: { $exists: true, $ne: null },
    };

    if (filters?.search) {
      const searchRegex = { $regex: String(filters.search), $options: 'i' };
      query.$or = [
        { locationName: searchRegex },
        { locality: searchRegex },
        { address: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
      ];
    }

    if (filters?.locationType) {
      query.locationType = filters.locationType;
    }

    const [locations, total] = await Promise.all([
      this.locationModel
        .find(query)
        .sort({ deletedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.locationModel.countDocuments(query),
    ]);

    return {
      locations,
      total,
      page,
      limit,
      totalPages: this.paginationService.calculateTotalPages(total, limit),
    };
  }

  async restoreLocation(locationId: string): Promise<LocationDocument> {
    const expressService = await getExpressService();
    if (expressService && expressService.restoreLocation) {
      return expressService.restoreLocation(locationId) as any;
    }

    await this.databaseService.ensureConnectionReady();
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');
    const location = await this.locationModel.findById(locationObjectId).exec();
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (!location.isDeleted) {
      return location;
    }
    location.isDeleted = false;
    location.deletedAt = undefined;
    location.isActive = true;
    await location.save();
    return location;
  }

  async permanentlyDeleteLocation(locationId: string): Promise<void> {
    const expressService = await getExpressService();
    if (expressService && expressService.permanentlyDeleteLocation) {
      await expressService.permanentlyDeleteLocation(locationId);
      return;
    }

    await this.databaseService.ensureConnectionReady();
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');
    const result = await this.locationModel.deleteOne({ _id: locationObjectId }).exec();
    if (!result.deletedCount) {
      throw new NotFoundException('Location not found');
    }
  }

  // Helper method to get location by ID (for other services)
  async findById(locationId: string): Promise<LocationDocument | null> {
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');
    return this.locationModel.findOne({
      _id: locationObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();
  }

  // Get the Mongoose model instance (for compatibility)
  getModel(): Model<LocationDocument> {
    return this.locationModel;
  }

  // Increment usage count (for location.usage.service.ts compatibility)
  async incrementUsage(locationId: string): Promise<void> {
    const locationObjectId = this.validationService.validateObjectId(locationId, 'locationId');
    await this.locationModel.findByIdAndUpdate(
      locationObjectId,
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      },
      { new: true }
    ).exec();
  }
}

// Export wrapper functions for Express services that import as namespace
// These allow analytics-report.service.ts to call LocationService methods
let locationServiceInstance: LocationService | null = null;

export const getLocationServiceInstance = (): LocationService => {
  if (!locationServiceInstance) {
    throw new Error('LocationService instance not initialized. This should only be called from NestJS context.');
  }
  return locationServiceInstance;
};

export const setLocationServiceInstance = (instance: LocationService): void => {
  locationServiceInstance = instance;
};

// Wrapper function for Express services
export const getLocationAnalytics = async (filters?: any): Promise<any> => {
  const instance = getLocationServiceInstance();
  return instance.getLocationAnalytics(filters);
};
