import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisClientType } from 'redis';
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
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType | null,
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
    if (userRole === 'agent' || userRole === 'user') {
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

    const userObjectId = this.validationService.validateObjectId(userId, 'userId');

    // Agent: only collections they collected or created (no location widening)
    if (userRole === 'agent') {
      return {
        ...baseQuery,
        $or: [
          { collectedBy: userObjectId },
          { userId: userObjectId },
        ],
      };
    }

    // If locationIds is [], user has no defaultLocation (match nothing)
    if (locationIds.length === 0) {
      return {
        ...baseQuery,
        _id: { $in: [] }, // Empty array = no matches
      };
    }

    // User: must be the owner AND at the defaultLocation
    return {
      ...baseQuery,
      userId: userObjectId,
      locationId: { $in: locationIds },
    };
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

  private getDashboardCacheKey(userId: string, userRole?: string): string {
    return `dashboard:${userId}:${userRole ?? 'all'}`;
  }

  private async getCachedDashboard<T>(cacheKey: string): Promise<T | null> {
    if (!this.redisClient?.isOpen) {
      return null;
    }
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.logger.debug(`Dashboard cache hit: ${cacheKey}`);
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn('Dashboard cache read error', err);
    }
    return null;
  }

  private async setCachedDashboard<T>(cacheKey: string, value: T, ttlSeconds = 60): Promise<void> {
    if (!this.redisClient?.isOpen) {
      return;
    }
    try {
      await this.redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      this.logger.warn('Dashboard cache write error', err);
    }
  }

  /**
   * Compute today's collection statistics for the dashboard
   */
  private async getTodayCollectionStats(
    projectFilter: Record<string, unknown>,
    todayStart: Date,
    todayEnd: Date,
  ): Promise<Record<string, number>> {
    const pipeline: any[] = [
      {
        $match: {
          ...projectFilter,
          collectionDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          collections: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
          withReceipt: {
            $sum: { $cond: [{ $and: [{ $ne: ['$receiptNumber', null] }, { $ne: ['$receiptNumber', ''] }] }, 1, 0] },
          },
          receiptsCount: {
            $sum: { $cond: [{ $and: [{ $ne: ['$receiptNumber', null] }, { $ne: ['$receiptNumber', ''] }] }, 1, 0] },
          },
          revenueGst: { $sum: { $ifNull: ['$gstAmount', 0] } },
          revenueNet: { $sum: { $ifNull: ['$subTotal', 0] } },
        },
      },
    ];

    const result = await this.projectModel.aggregate(pipeline as any).exec();
    const row = result?.[0] || {};
    const collections = Number(row.collections) || 0;
    const withReceipt = Number(row.withReceipt) || 0;
    const totalRevenue = Number(row.totalRevenue) || 0;
    const revenueNet = Number(row.revenueNet) || 0;
    const revenueGst = Number(row.revenueGst) || 0;

    return {
      collections,
      totalWeight: Number(row.totalWeight) || 0,
      totalRevenue,
      withReceipt,
      withoutReceipt: Math.max(0, collections - withReceipt),
      receiptsCount: withReceipt,
      receiptsTotalAmount: totalRevenue,
      revenueTotal: totalRevenue,
      revenueGst,
      revenueNet: revenueNet > 0 ? revenueNet : totalRevenue - revenueGst,
    };
  }

  /**
   * Compute performance metrics for admin/agent dashboard
   */
  private async getPerformanceMetrics(
    projectFilter: Record<string, unknown>,
    locationFilter: Record<string, unknown>,
    todayStart: Date,
    todayEnd: Date,
  ): Promise<Record<string, unknown>> {
    const todayProjectFilter = {
      ...projectFilter,
      collectionDate: { $gte: todayStart, $lte: todayEnd },
    };

    const [todayStats, activeLocations, activeAgents] = await Promise.all([
      this.projectModel.aggregate([
        { $match: todayProjectFilter },
        {
          $group: {
            _id: null,
            collections: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
            hours: { $addToSet: { $hour: '$collectionDate' } },
          },
        },
      ]).exec(),
      this.locationModel
        .find({ ...locationFilter, isActive: true })
        .select('locationName usageCount')
        .sort({ usageCount: -1 })
        .limit(9)
        .lean()
        .exec(),
      this.userModel
        .find({ role: 'agent', isActive: true, isDeleted: { $ne: true }, deletedAt: { $exists: false } })
        .select('_id name')
        .lean()
        .exec(),
    ]);

    const stats = todayStats?.[0] || { collections: 0, totalRevenue: 0, hours: [] };
    const collections = Number(stats.collections) || 0;
    const hours: number[] = (stats.hours || []).filter((h: any) => typeof h === 'number') as number[];
    const collectionsPerHour = hours.length > 0 ? Number((collections / hours.length).toFixed(2)) : 0;
    const revenuePerCollection = collections > 0 ? Number((Number(stats.totalRevenue) / collections).toFixed(2)) : 0;

    // Determine peak activity hour (or string fallback)
    const hourCounts: Record<number, number> = {};
    const todayProjects = await this.projectModel
      .find(todayProjectFilter)
      .select('collectionDate')
      .lean()
      .exec();
    todayProjects.forEach((p: any) => {
      const h = p.collectionDate ? new Date(p.collectionDate).getHours() : null;
      if (h !== null) {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
    });
    let peakHour: number | null = null;
    let peakCount = 0;
    Object.entries(hourCounts).forEach(([h, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = Number(h);
      }
    });
    const peakActivityTime = peakHour !== null
      ? `${String(peakHour).padStart(2, '0')}:00 - ${String(peakHour + 1).padStart(2, '0')}:00`
      : 'No activity yet';

    // Active agents with today's collection counts
    const agentIds = activeAgents.map((u: any) => u._id.toString());
    const agentStats = await this.projectModel.aggregate([
      {
        $match: {
          ...todayProjectFilter,
          collectedBy: { $in: agentIds.map((id) => this.validationService.validateObjectId(id, 'agentId')) },
        },
      },
      {
        $group: {
          _id: '$collectedBy',
          collections: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
    ]).exec();

    const agentStatsMap: Record<string, { collections: number; revenue: number }> = {};
    agentStats.forEach((item: any) => {
      const id = item._id?.toString?.() || String(item._id);
      agentStatsMap[id] = { collections: item.collections || 0, revenue: item.revenue || 0 };
    });

    return {
      collectionsPerHour,
      peakActivityTime,
      revenuePerCollection,
      activeAgents: activeAgents.map((agent: any) => {
        const id = agent._id.toString();
        const stat = agentStatsMap[id] || { collections: 0, revenue: 0 };
        return {
          agentId: id,
          agentName: agent.name || 'Unknown',
          collections: stat.collections,
          revenue: stat.revenue,
        };
      }).filter((a: any) => a.collections > 0),
      activeLocations: activeLocations.map((loc: any) => ({
        locationName: loc.locationName || 'Unknown',
        collections: loc.usageCount || 0,
        revenue: 0, // Revenue by location requires aggregation; fallback to 0
      })),
    };
  }

  /**
   * Get recent collections for dashboard
   */
  private async getRecentCollections(
    projectFilter: Record<string, unknown>,
    limit = 8,
  ): Promise<any[]> {
    const collections = await this.projectModel
      .find(projectFilter)
      .sort({ collectionDate: -1, createdAt: -1 })
      .limit(limit)
      .select('locationName collectionDate totalWeight totalAmount receiptNumber')
      .lean()
      .exec();

    return collections.map((c: any) => ({
      _id: c._id?.toString() || '',
      locationName: c.locationName || 'Collection',
      collectionDate: c.collectionDate ? c.collectionDate.toISOString() : null,
      totalWeight: Number(c.totalWeight) || 0,
      totalAmount: Number(c.totalAmount) || 0,
      receiptNumber: c.receiptNumber || '',
    }));
  }

  /**
   * Compute collections growth: this month vs last month and 30-day trend
   */
  private async getCollectionsGrowth(
    projectFilter: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [thisMonth, lastMonth, trend] = await Promise.all([
      this.projectModel.countDocuments({
        ...projectFilter,
        collectionDate: { $gte: thisMonthStart },
      }).exec(),
      this.projectModel.countDocuments({
        ...projectFilter,
        collectionDate: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }).exec(),
      this.projectModel.aggregate([
        {
          $match: {
            ...projectFilter,
            collectionDate: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$collectionDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
    ]);

    const growth = lastMonth > 0 ? Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(2)) : 0;

    return {
      thisMonth,
      lastMonth,
      growth,
      trend: trend.map((item: any) => ({ date: item._id, count: item.count || 0 })),
    };
  }

  /**
   * Compute last 7 days usage for dashboard chart
   */
  private async getRecentUsage(
    projectFilter: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trend = await this.projectModel.aggregate([
      {
        $match: {
          ...projectFilter,
          collectionDate: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$collectionDate' } },
          collections: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    // Fill missing days with 0
    const trendMap: Record<string, { collections: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = { collections: 0, revenue: 0 };
    }
    trend.forEach((item: any) => {
      if (trendMap[item._id]) {
        trendMap[item._id] = { collections: item.collections || 0, revenue: item.revenue || 0 };
      }
    });

    const last7Days = Object.entries(trendMap).map(([date, values]) => ({
      date,
      collections: values.collections,
      revenue: values.revenue,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { last7Days };
  }

  /**
   * Compute user growth by month for the last 12 months
   */
  private async getUserGrowth(userFilter: Record<string, unknown>): Promise<any[]> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const growth = await this.userModel.aggregate([
      {
        $match: {
          ...userFilter,
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]).exec();

    return growth.map((item: any) => ({
      _id: item._id,
      count: item.count || 0,
    }));
  }

  async getDashboard(userId: string, userRole?: string): Promise<DashboardResponseDto> {
    const cacheKey = this.getDashboardCacheKey(userId, userRole);
    const cached = await this.getCachedDashboard<DashboardResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.databaseService.ensureConnectionReady();

    // Get location IDs for filtering
    const locationIds = await this.getUserLocationIds(userId, userRole);

    const userFilter = this.buildUserFilter(userId, userRole);
    const projectFilter = this.buildProjectFilter(userId, userRole, locationIds);
    const locationFilter = this.buildLocationFilter(locationIds);
    const { start: todayStart, end: todayEnd } = this.getTodayRange();

    const todayCreatedAtFilter = { createdAt: { $gte: todayStart, $lte: todayEnd } };

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalLocations,
      todayUsers,
      todayLocations,
      todayCollectionStats,
      recentCollections,
      performance,
      collectionsGrowth,
      recentUsage,
      userGrowth,
    ] = await Promise.all([
      this.userModel.countDocuments(userFilter),
      this.userModel.countDocuments({ ...userFilter, isActive: true }),
      this.projectModel.countDocuments(projectFilter),
      this.locationModel.countDocuments(locationFilter),
      this.userModel.countDocuments({ ...userFilter, ...todayCreatedAtFilter }),
      this.locationModel.countDocuments({ ...locationFilter, ...todayCreatedAtFilter }),
      this.getTodayCollectionStats(projectFilter, todayStart, todayEnd),
      this.getRecentCollections(projectFilter, 8),
      this.getPerformanceMetrics(projectFilter, locationFilter, todayStart, todayEnd),
      this.getCollectionsGrowth(projectFilter),
      this.getRecentUsage(projectFilter),
      this.getUserGrowth(userFilter),
    ]);

    // Ensure all values are numbers (defensive check)
    const safeTotalUsers = Number(totalUsers) || 0;
    const safeActiveUsers = Number(activeUsers) || 0;
    const safeTotalProjects = Number(totalProjects) || 0;
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
        today: todayCollectionStats.collections,
        collections: safeTotalProjects, // Alias for backward compatibility
      },
      locations: {
        total: safeTotalLocations,
      },
    };

    const today: TodayActivityDto = {
      newUsers: safeTodayUsers,
      newProjects: todayCollectionStats.collections,
      newLocations: safeTodayLocations,
      collections: todayCollectionStats.collections,
      date: todayStart.toISOString().split('T')[0],
      totalWeight: todayCollectionStats.totalWeight,
      totalRevenue: todayCollectionStats.totalRevenue,
      withReceipt: todayCollectionStats.withReceipt,
      withoutReceipt: todayCollectionStats.withoutReceipt,
      receiptsCount: todayCollectionStats.receiptsCount,
      receiptsTotalAmount: todayCollectionStats.receiptsTotalAmount,
      revenueTotal: todayCollectionStats.revenueTotal,
      revenueGst: todayCollectionStats.revenueGst,
      revenueNet: todayCollectionStats.revenueNet,
    };

    const recentUsers = await this.userModel
      .find(userFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt')
      .lean()
      .exec();

    const result: DashboardResponseDto = {
      overview,
      today,
      collections: safeTotalProjects, // Top-level alias for backward compatibility (total collections)
      stats: { ...overview, recentUsers, userGrowth } as any,
      recentUsers,
      performance,
      recentCollections,
      collectionsGrowth,
      recentUsage,
      userGrowth,
    };

    await this.setCachedDashboard(cacheKey, result);
    return result;
  }

  async getTodayActivity(userId: string, userRole?: string): Promise<TodayActivityDto> {
    const cacheKey = `dashboard:today:${userId}:${userRole ?? 'all'}`;
    const cached = await this.getCachedDashboard<TodayActivityDto>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.databaseService.ensureConnectionReady();

    // Get location IDs for filtering
    const locationIds = await this.getUserLocationIds(userId, userRole);

    const userFilter = this.buildUserFilter(userId, userRole);
    const projectFilter = this.buildProjectFilter(userId, userRole, locationIds);
    const locationFilter = this.buildLocationFilter(locationIds);
    const { start: todayStart, end: todayEnd } = this.getTodayRange();

    const todayCreatedAtFilter = { createdAt: { $gte: todayStart, $lte: todayEnd } };

    const [newUsers, newLocations, todayCollectionStats] = await Promise.all([
      this.userModel.countDocuments({ ...userFilter, ...todayCreatedAtFilter }),
      this.locationModel.countDocuments({ ...locationFilter, ...todayCreatedAtFilter }),
      this.getTodayCollectionStats(projectFilter, todayStart, todayEnd),
    ]);

    // Ensure all values are numbers (defensive check)
    const safeNewUsers = Number(newUsers) || 0;
    const safeNewLocations = Number(newLocations) || 0;
    const safeNewProjects = todayCollectionStats.collections;

    const result: TodayActivityDto = {
      newUsers: safeNewUsers,
      newProjects: safeNewProjects,
      newLocations: safeNewLocations,
      collections: safeNewProjects,
      date: todayStart.toISOString().split('T')[0],
      totalWeight: todayCollectionStats.totalWeight,
      totalRevenue: todayCollectionStats.totalRevenue,
      withReceipt: todayCollectionStats.withReceipt,
      withoutReceipt: todayCollectionStats.withoutReceipt,
      receiptsCount: todayCollectionStats.receiptsCount,
      receiptsTotalAmount: todayCollectionStats.receiptsTotalAmount,
      revenueTotal: todayCollectionStats.revenueTotal,
      revenueGst: todayCollectionStats.revenueGst,
      revenueNet: todayCollectionStats.revenueNet,
    };

    await this.setCachedDashboard(cacheKey, result);
    return result;
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

  async createUser(data: any, creatorRole?: string, performedBy?: string, req?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { createUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    // creatorRole is required by the Express service, default to 'admin' if not provided
    return createUser(data, creatorRole || 'admin', this.mailService, verifiedConnection, performedBy, req);
  }

  async updateUser(userId: string, data: any, updaterRole?: string, performedBy?: string, req?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { updateUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return updateUser(userId, data, updaterRole, verifiedConnection, performedBy, req);
  }

  async toggleUserStatus(userId: string, isActive: boolean, performedBy?: string, req?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    // Use updateUser to toggle status since toggleUserStatus doesn't exist
    const { updateUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return updateUser(userId, { isActive }, undefined, verifiedConnection, performedBy, req);
  }

  async deleteUser(userId: string, _deleterRole?: string, performedBy?: string, req?: any): Promise<void> {
    await this.databaseService.ensureConnectionReady();
    const { deleteUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    await deleteUser(userId, verifiedConnection, performedBy, req);
  }

  async getDeletedUsers(filters?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { getDeletedUsers } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return getDeletedUsers(filters, verifiedConnection);
  }

  async restoreUser(userId: string, performedBy?: string, req?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { restoreUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return restoreUser(userId, verifiedConnection, performedBy, req);
  }

  async permanentlyDeleteUser(userId: string, performedBy?: string, req?: any): Promise<void> {
    await this.databaseService.ensureConnectionReady();
    const { permanentlyDeleteUser } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    await permanentlyDeleteUser(userId, verifiedConnection, performedBy, req);
  }

  async getUserStats(requesterId?: string, requesterRole?: string): Promise<any> {
    await this.databaseService.ensureConnectionReady();
    const { getUserStats } = await import('./user-admin.service');
    const verifiedConnection = this.databaseService.getConnection();
    return getUserStats(requesterId, requesterRole, verifiedConnection);
  }

  async ensureConnectionReady(): Promise<void> {
    return this.databaseService.ensureConnectionReady();
  }

  getConnection() {
    return this.databaseService.getConnection();
  }
}
