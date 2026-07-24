import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Project, ProjectDocument } from '../project/schemas/project.schema';
import { Location, LocationDocument } from '../location/schemas/location.schema';
import { ValidationService } from '../../common/validation/validation.service';
import { MailService } from '../../infrastructure/mail/mail.service';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  DashboardResponseDto,
  TodayActivityDto,
  DashboardOverviewDto,
} from './dto/dashboard-response.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @Inject(ValidationService) private validationService: ValidationService,
    @Inject(DatabaseService) private databaseService: DatabaseService,
  ) {}

  /**
   * Build base query for non-deleted records
   */
  private buildBaseQuery(): Record<string, unknown> {
    return {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };
  }

  /**
   * Build user filter based on role
   */
  private buildUserFilter(userId: string, userRole?: string): Record<string, unknown> {
    const baseQuery = this.buildBaseQuery();
    if (userRole === 'agent') {
      const userObjectId = this.validationService.validateObjectId(userId, 'userId');
      return { ...baseQuery, _id: userObjectId };
    }
    return baseQuery;
  }

  /**
   * Build project filter based on role and location assignments
   * @param locationIds - null = no filtering, [] = no locations (match nothing), [id1, id2, ...] = filter by location IDs
   */
  private buildProjectFilter(
    userId: string,
    userRole?: string,
    locationIds?: Types.ObjectId[] | null,
  ): Record<string, unknown> {
    const baseQuery = this.buildBaseQuery();

    // If locationIds is null or undefined, admin/super_admin sees all (no location filtering)
    if (locationIds === null || locationIds === undefined) {
      return baseQuery;
    }

    // If locationIds is [], user/agent has no locations (match nothing)
    if (locationIds.length === 0) {
      return {
        ...baseQuery,
        _id: { $in: [] }, // Empty array = no matches
      };
    }

    // Filter by location IDs
    const locationFilter: Record<string, unknown> = {
      ...baseQuery,
      locationId: { $in: locationIds },
    };

    // For agents, also include projects they collected/created (even if not in assigned locations)
    if (userRole === 'agent') {
      const userObjectId = this.validationService.validateObjectId(userId, 'userId');
      return {
        ...locationFilter,
        $or: [
          { locationId: { $in: locationIds } },
          { collectedBy: userObjectId },
          { userId: userObjectId },
        ],
      };
    }

    return locationFilter;
  }

  /**
   * Build location filter based on role and location assignments
   * @param locationIds - null = no filtering, [] = no locations (match nothing), [id1, id2, ...] = filter by location IDs
   */
  private buildLocationFilter(
    locationIds?: Types.ObjectId[] | null,
  ): Record<string, unknown> {
    const baseQuery = this.buildBaseQuery();

    // If locationIds is null or undefined, admin sees all (no filtering)
    if (locationIds === null || locationIds === undefined) {
      return baseQuery;
    }

    // If locationIds is [], user/agent has no locations (match nothing)
    if (locationIds.length === 0) {
      return {
        ...baseQuery,
        _id: { $in: [] }, // Empty array = no matches
      };
    }

    // Filter by location IDs
    return {
      ...baseQuery,
      _id: { $in: locationIds },
    };
  }

  /**
   * Get today's date range (start and end of day)
   */
  private getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Get location IDs for a user based on their role
   * @returns null = no filtering (admin/super_admin), [] = no locations, [id1, id2, ...] = location IDs
   */
  private async getUserLocationIds(userId: string, userRole?: string): Promise<Types.ObjectId[] | null> {
    // Admin and super_admin see all data (no filtering)
    if (userRole === 'admin' || userRole === 'super_admin') {
      return null;
    }

    const userObjectId = this.validationService.validateObjectId(userId, 'userId');

    // Users see data for their defaultLocation only
    if (userRole === 'user') {
      const user = await this.userModel.findById(userObjectId).select('defaultLocation').lean();
      if (user?.defaultLocation) {
        return [user.defaultLocation as Types.ObjectId];
      }
      return []; // No default location assigned
    }

    // Agents see data for all their assigned locations
    if (userRole === 'agent') {
      const locations = await this.locationModel
        .find({
          assignedToAgent: userObjectId,
          isDeleted: { $ne: true },
          deletedAt: { $exists: false },
        })
        .select('_id')
        .lean();
      return locations.map((loc) => loc._id as Types.ObjectId);
    }

    // Default: no filtering (shouldn't reach here, but safe fallback)
    return null;
  }

  async getAdminStats(): Promise<any> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    const baseQuery = this.buildBaseQuery();
    
    const [totalUsers, activeUsers, totalProjects, totalLocations] = await Promise.all([
      this.userModel.countDocuments(baseQuery),
      this.userModel.countDocuments({ ...baseQuery, isActive: true }),
      this.projectModel.countDocuments(baseQuery),
      this.locationModel.countDocuments(baseQuery),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      projects: {
        total: totalProjects,
      },
      locations: {
        total: totalLocations,
      },
      // Top-level aliases expected by tests/consumers
      totalUsers,
      activeUsers,
      totalContent: totalProjects,
      recentActivity: totalProjects,
    };
  }

  async getDashboard(userId: string, userRole?: string): Promise<DashboardResponseDto> {
    await this.databaseService.ensureConnectionReady();

    // Get location IDs for filtering
    const locationIds = await this.getUserLocationIds(userId, userRole);

    const userFilter = this.buildUserFilter(userId, userRole);
    const projectFilter = this.buildProjectFilter(userId, userRole, locationIds);
    const locationFilter = this.buildLocationFilter(locationIds);
    const { start: todayStart, end: todayEnd } = this.getTodayRange();

    const todayDateFilter = { createdAt: { $gte: todayStart, $lte: todayEnd } };

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalLocations,
      todayProjects,
      todayUsers,
      todayLocations,
    ] = await Promise.all([
      this.userModel.countDocuments(userFilter),
      this.userModel.countDocuments({ ...userFilter, isActive: true }),
      this.projectModel.countDocuments(projectFilter),
      this.locationModel.countDocuments(locationFilter),
      this.projectModel.countDocuments({ ...projectFilter, ...todayDateFilter }),
      this.userModel.countDocuments({ ...userFilter, ...todayDateFilter }),
      this.locationModel.countDocuments({ ...locationFilter, ...todayDateFilter }),
    ]);

    // Ensure all values are numbers (defensive check)
    const safeTotalUsers = Number(totalUsers) || 0;
    const safeActiveUsers = Number(activeUsers) || 0;
    const safeTotalProjects = Number(totalProjects) || 0;
    const safeTodayProjects = Number(todayProjects) || 0;
    const safeTotalLocations = Number(totalLocations) || 0;
    const safeTodayUsers = Number(todayUsers) || 0;
    const safeTodayLocations = Number(todayLocations) || 0;

    const overview: DashboardOverviewDto = {
      users: {
        total: safeTotalUsers,
        active: safeActiveUsers,
        inactive: Math.max(0, safeTotalUsers - safeActiveUsers),
      },
      projects: {
        total: safeTotalProjects,
        today: safeTodayProjects,
        collections: safeTotalProjects, // Alias for backward compatibility
      },
      locations: {
        total: safeTotalLocations,
      },
    };

    const today: TodayActivityDto = {
      newUsers: safeTodayUsers,
      newProjects: safeTodayProjects,
      newLocations: safeTodayLocations,
      collections: safeTodayProjects, // Alias for backward compatibility
      date: todayStart.toISOString().split('T')[0],
    };

    const recentUsers = await this.userModel
      .find(userFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt')
      .lean()
      .exec();

    return {
      overview,
      today,
      collections: safeTotalProjects, // Top-level alias for backward compatibility (total collections)
      stats: overview,
      recentUsers,
    };
  }

  async getTodayActivity(userId: string, userRole?: string): Promise<TodayActivityDto> {
    await this.databaseService.ensureConnectionReady();

    // Get location IDs for filtering
    const locationIds = await this.getUserLocationIds(userId, userRole);

    const userFilter = this.buildUserFilter(userId, userRole);
    const projectFilter = this.buildProjectFilter(userId, userRole, locationIds);
    const locationFilter = this.buildLocationFilter(locationIds);
    const { start: todayStart, end: todayEnd } = this.getTodayRange();

    const todayDateFilter = { createdAt: { $gte: todayStart, $lte: todayEnd } };

    const [newUsers, newProjects, newLocations] = await Promise.all([
      this.userModel.countDocuments({ ...userFilter, ...todayDateFilter }),
      this.projectModel.countDocuments({ ...projectFilter, ...todayDateFilter }),
      this.locationModel.countDocuments({ ...locationFilter, ...todayDateFilter }),
    ]);

    // Ensure all values are numbers (defensive check)
    const safeNewUsers = Number(newUsers) || 0;
    const safeNewProjects = Number(newProjects) || 0;
    const safeNewLocations = Number(newLocations) || 0;

    return {
      newUsers: safeNewUsers,
      newProjects: safeNewProjects,
      newLocations: safeNewLocations,
      collections: safeNewProjects, // Alias for backward compatibility
      date: todayStart.toISOString().split('T')[0],
    };
  }

}

@Injectable()
export class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly databaseService: DatabaseService,
  ) {}

  async getUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<any> {
    // Ensure database connection is ready before operations
    try {
      this.logger.log('[UserAdminService] Ensuring database connection ready before getUsers...');
      await this.databaseService.ensureConnectionReady();
      this.logger.log('[UserAdminService] Database connection verified, proceeding with getUsers');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[UserAdminService] Failed to ensure database connection: ${errorMsg}`);
      throw error;
    }
    
    // Import Express service functions directly
    const { getUsers } = await import('./user-admin.service');
    // Get the verified connection from DatabaseService to ensure same connection instance
    const verifiedConnection = this.databaseService.getConnection();
    // Cast role to proper type for UserListParams
    const params = filters ? {
      ...filters,
      role: filters.role as 'user' | 'agent' | 'admin' | 'super_admin' | undefined,
    } : undefined;
    return getUsers(params, verifiedConnection);
  }

  async getUserById(userId: string): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { getUserById } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return getUserById(userId, verifiedConnection);
  }

  async createUser(data: any, creatorRole?: string): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { createUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    // creatorRole is required by the Express service, default to 'admin' if not provided
    return createUser(data, creatorRole || 'admin', this.mailService, verifiedConnection);
  }

  async updateUser(userId: string, data: any, updaterRole?: string): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { updateUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return updateUser(userId, data, updaterRole, verifiedConnection);
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    // Use updateUser to toggle status since toggleUserStatus doesn't exist
    const { updateUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return updateUser(userId, { isActive }, undefined, verifiedConnection);
  }

  async deleteUser(userId: string, _deleterRole?: string): Promise<void> {
    await this.databaseService.ensureConnectionReady();
    const { deleteUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    // deleteUser only takes userId, deleterRole is not used
    await deleteUser(userId, verifiedConnection);
  }

  async getDeletedUsers(filters?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { getDeletedUsers } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return getDeletedUsers(filters, verifiedConnection);
  }

  async restoreUser(userId: string): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { restoreUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return restoreUser(userId, verifiedConnection);
  }

  async permanentlyDeleteUser(userId: string): Promise<void> {
    await this.databaseService.ensureConnectionReady();
    const { permanentlyDeleteUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    await permanentlyDeleteUser(userId, verifiedConnection);
  }

  async getUserStats(requesterRole?: string): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { getUserStats } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return getUserStats(requesterRole, verifiedConnection);
  }

  async ensureConnectionReady(): Promise<void> {
    return this.databaseService.ensureConnectionReady();
  }

  getConnection() {
    return this.databaseService.getConnection();
  }
}
