import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ValidationService } from '../../common/validation/validation.service';
import { PaginationService } from '../../common/pagination/pagination.service';
import { PAGINATION } from '../../config/constants';
import { DatabaseService } from '../../infrastructure/database/database.service';

// Note: This service is in transition from Express to NestJS
// Many methods still need full NestJS implementation
// The old Express service has been removed as part of migration

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private validationService: ValidationService,
    private paginationService: PaginationService,
    private databaseService: DatabaseService,
  ) { }

  async archiveDuplicateCollections(params: {
    mode: 'dry-run' | 'apply';
    limitGroups?: number;
  }): Promise<{
    groups: Array<{
      key: string;
      keepId: string;
      archivedIds: string[];
      skippedIds: string[];
    }>;
    totals: {
      groups: number;
      candidates: number;
      archived: number;
      skipped: number;
    };
  }> {
    await this.databaseService.ensureConnectionReady();

    const { mode, limitGroups } = params;

    const projects = await this.projectModel
      .find({
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
      .select('_id receiptNumber userId locationId collectionDate totalAmount createdAt')
      .lean();

    const normalizeReceipt = (value: unknown) => String(value || '').trim().toLowerCase();
    const normalizeDateKey = (value: unknown) => {
      if (!value) return '';
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    };
    const normalizeAmountKey = (value: unknown) => {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(n)) return '';
      return n.toFixed(2);
    };

    const report: {
      groups: Array<{
        key: string;
        keepId: string;
        archivedIds: string[];
        skippedIds: string[];
      }>;
      totals: {
        groups: number;
        candidates: number;
        archived: number;
        skipped: number;
      };
    } = {
      groups: [],
      totals: {
        groups: 0,
        candidates: 0,
        archived: 0,
        skipped: 0,
      },
    };

    const processedIds = new Set<string>();

    const addGroup = async (key: string, items: Array<any>) => {
      if (items.length <= 1) return;

      const sorted = [...items].sort((a, b) => {
        const createdDiff = (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        if (createdDiff !== 0) return createdDiff;
        return String(a._id).localeCompare(String(b._id));
      });

      const keep = sorted[0];
      const rest = sorted.slice(1);

      const groupReport = {
        key,
        keepId: String(keep._id),
        archivedIds: [] as string[],
        skippedIds: [] as string[],
      };

      for (const dup of rest) {
        const dupId = String(dup._id);

        if (processedIds.has(dupId)) {
          groupReport.skippedIds.push(dupId);
          report.totals.skipped += 1;
          continue;
        }

        processedIds.add(dupId);
        groupReport.archivedIds.push(dupId);
        report.totals.archived += 1;

        if (mode === 'apply') {
          await this.projectModel.updateOne(
            { _id: dup._id },
            { $set: { isDeleted: true, deletedAt: new Date() } },
          );
        }
      }

      report.groups.push(groupReport);
      report.totals.groups += 1;
      report.totals.candidates += rest.length;
    };

    // 1) Receipt-number duplicates
    const groupsByReceipt = new Map<string, Array<any>>();
    for (const p of projects) {
      const receipt = normalizeReceipt(p.receiptNumber);
      if (!receipt) continue;
      const key = `receipt:${receipt}`;
      const existing = groupsByReceipt.get(key) || [];
      existing.push(p);
      groupsByReceipt.set(key, existing);
    }

    const receiptGroups = Array.from(groupsByReceipt.entries())
      .filter(([, items]) => items.length > 1)
      .slice(0, typeof limitGroups === 'number' ? Math.max(0, limitGroups) : undefined);

    for (const [key, items] of receiptGroups) {
      await addGroup(key, items);
    }

    // 2) Heuristic duplicates (userId + locationId + collectionDate + totalAmount)
    const groupsByHeuristic = new Map<string, Array<any>>();
    for (const p of projects) {
      const id = String(p._id);
      if (processedIds.has(id)) continue;

      const userId = p.userId ? String(p.userId) : '';
      const locationId = p.locationId ? String(p.locationId) : '';
      const dateKey = normalizeDateKey(p.collectionDate);
      const amountKey = normalizeAmountKey(p.totalAmount);

      if (!userId || !dateKey || !amountKey) continue;

      const key = `heuristic:${userId}|${locationId}|${dateKey}|${amountKey}`;
      const existing = groupsByHeuristic.get(key) || [];
      existing.push(p);
      groupsByHeuristic.set(key, existing);
    }

    const remainingLimit = typeof limitGroups === 'number'
      ? Math.max(0, limitGroups - report.totals.groups)
      : undefined;

    const heuristicGroups = Array.from(groupsByHeuristic.entries())
      .filter(([, items]) => items.length > 1)
      .slice(0, remainingLimit);

    for (const [key, items] of heuristicGroups) {
      await addGroup(key, items);
    }

    return report;
  }

  // Core functions - implement using NestJS schema
  // TODO: Migrate remaining complex functions gradually
  async createProject(data: CreateProjectDto, userId: string, _userRole?: string, _req?: any): Promise<ProjectDocument> {
    await this.databaseService.ensureConnectionReady();

    const userObjectId = this.validationService.validateObjectId(userId, 'userId');
    const now = new Date();

    const items = (data.collectionItems || []).map((item) => {
      const weight = Number(item.weight);
      const rate = Number(item.rate);
      return {
        materialType: item.materialType,
        weight,
        rate,
        amount: weight * rate,
      };
    });

    const totalWeight = items.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
    const subTotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const gstRate = data.gstRate !== undefined ? Number(data.gstRate) : 18;
    const gstAmount = subTotal * (gstRate / 100);
    const totalAmount = subTotal + gstAmount;

    const project = new this.projectModel({
      userId: userObjectId,
      collectedBy: userObjectId,
      serviceType: data.serviceType,
      title: data.title,
      description: data.description,
      priority: data.priority,
      location: data.location,
      locationType: data.locationType,
      locationName: data.locationName,
      collectionItems: items,
      totalWeight,
      subTotal,
      gstRate,
      gstAmount,
      totalAmount,
      collectionDate: data.collectionDate ? new Date(data.collectionDate) : now,
      status: 'pending',
    } as any);

    if (data.locationId) {
      project.locationId = this.validationService.validateObjectId(data.locationId, 'locationId');
    }

    return project.save();
  }

  async getProjectById(projectId: string, userId: string): Promise<ProjectDocument | null> {
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    // Find project excluding deleted ones
    const project = await this.projectModel.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();

    if (!project) {
      return null;
    }

    // For customer endpoints, ensure user owns the project
    // For admin endpoints, skip this check (handled by controller guards)
    if (userId && project.userId.toString() !== userId) {
      return null;
    }

    return project;
  }

  async getAllProjects(filters?: any): Promise<any> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    // Extract pagination
    const validatedPage = this.paginationService.validatePage(filters?.page, 1);
    const validatedLimit = this.paginationService.validateLimit(
      filters?.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );
    const skip = this.paginationService.calculateSkip(validatedPage, validatedLimit);

    // Build base query (exclude deleted unless includeDeleted flag is set)
    const baseQuery: Record<string, unknown> = filters?.includeDeleted
      ? {} // Include all (including deleted) if flag is set
      : {
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      };

    // Build filter
    const filter: Record<string, unknown> = { ...baseQuery };

    // Role-based filtering
    const orConditions: Record<string, unknown>[] = [];
    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      orConditions.push(
        { collectedBy: userObjectId },
        { userId: userObjectId },
      );
    } else if (filters?.userRole === 'user' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      filter.userId = userObjectId;
    }
    // Admin/super_admin can see all projects

    // Filter by serviceType
    if (filters?.serviceType) {
      filter.serviceType = filters.serviceType;
    }

    // Filter by status
    if (filters?.status) {
      filter.status = filters.status;
    }

    // Filter by search (search in project name, address, etc.)
    if (filters?.search) {
      orConditions.push(
        { projectName: { $regex: filters.search, $options: 'i' } } as Record<string, unknown>,
        { address: { $regex: filters.search, $options: 'i' } } as Record<string, unknown>,
        { city: { $regex: filters.search, $options: 'i' } } as Record<string, unknown>,
        { state: { $regex: filters.search, $options: 'i' } } as Record<string, unknown>,
      );
    }

    // Add $or if we have conditions
    if (orConditions.length > 0) {
      filter.$or = orConditions;
    }

    // Date range filters
    if (filters?.startDate) {
      filter.createdAt = { ...(filter.createdAt as Record<string, unknown> || {}), $gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      filter.createdAt = { ...(filter.createdAt as Record<string, unknown> || {}), $lte: new Date(filters.endDate) };
    }

    // Build sort
    let sort: Record<string, 1 | -1> = { createdAt: -1 }; // Default: newest first
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'status':
          sort = { status: 1, createdAt: -1 };
          break;
        case 'serviceType':
          sort = { serviceType: 1, createdAt: -1 };
          break;
        default:
          sort = { createdAt: -1 };
      }
    }

    const [projects, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('userId', 'name email')
        .populate('collectedBy', 'name email')
        .populate('locationId', 'locationName address city state')
        .sort(sort)
        .skip(skip)
        .limit(validatedLimit)
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        projects,
        total,
        page: validatedPage,
        limit: validatedLimit,
        totalPages: this.paginationService.calculateTotalPages(total, validatedLimit),
      },
    };
  }

  async getProjectByIdAdmin(projectId: string, userId: string, userRole: string): Promise<ProjectDocument | null> {
    await this.databaseService.ensureConnectionReady();
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    const project = await this.projectModel
      .findOne({
        _id: projectObjectId,
        isDeleted: { $ne: true },
        deletedAt: { $exists: false },
      })
      .populate('userId', 'name email')
      .populate('collectedBy', 'name email')
      .populate('locationId', 'locationName address city state locationType')
      .exec();

    if (!project) return null;

    const requesterId = userId ? new Types.ObjectId(userId) : null;

    if (userRole === 'admin' || userRole === 'super_admin') {
      return project;
    }

    if (!requesterId) {
      return null;
    }

    if (userRole === 'user') {
      return String(project.userId) === String(requesterId) ? project : null;
    }

    if (userRole === 'agent') {
      const isOwner = String(project.userId) === String(requesterId);
      const isCollector = project.collectedBy ? String(project.collectedBy) === String(requesterId) : false;
      return isOwner || isCollector ? project : null;
    }

    return null;
  }

  async createCollection(data: CreateProjectDto, userId: string, userRole: string, req?: any): Promise<ProjectDocument> {
    return this.createProject(data, userId, userRole, req);
  }

  async updateCollection(projectId: string, userId: string, userRole: string, data: UpdateProjectDto, _req?: any): Promise<ProjectDocument> {
    await this.databaseService.ensureConnectionReady();
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    const project = await this.projectModel.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    });

    if (!project) {
      throw new NotFoundException('Collection not found');
    }

    const requesterId = userId ? new Types.ObjectId(userId) : null;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      if (!requesterId) {
        throw new NotFoundException('Collection not found');
      }
      if (userRole === 'user') {
        if (String(project.userId) !== String(requesterId)) {
          throw new NotFoundException('Collection not found');
        }
      }
      if (userRole === 'agent') {
        const isOwner = String(project.userId) === String(requesterId);
        const isCollector = project.collectedBy ? String(project.collectedBy) === String(requesterId) : false;
        if (!isOwner && !isCollector) {
          throw new NotFoundException('Collection not found');
        }
      }
    }

    if (data.title !== undefined) project.title = data.title;
    if (data.description !== undefined) project.description = data.description;
    if (data.priority !== undefined) (project as any).priority = data.priority;
    if (data.status !== undefined) (project as any).status = data.status;
    if (data.location !== undefined) (project as any).location = data.location;
    if (data.locationType !== undefined) (project as any).locationType = data.locationType;
    if (data.locationName !== undefined) (project as any).locationName = data.locationName;
    if (data.collectionDate !== undefined) (project as any).collectionDate = new Date(data.collectionDate);

    if (data.locationId !== undefined) {
      if (data.locationId === null || data.locationId === '') {
        (project as any).locationId = undefined;
      } else {
        (project as any).locationId = this.validationService.validateObjectId(String(data.locationId), 'locationId');
      }
    }

    // Recompute totals if items or gstRate change
    if (data.collectionItems !== undefined) {
      const items = (data.collectionItems || []).map((item) => {
        const weight = Number(item.weight);
        const rate = Number(item.rate);
        return {
          materialType: item.materialType,
          weight,
          rate,
          amount: weight * rate,
        };
      });
      (project as any).collectionItems = items;
      (project as any).totalWeight = items.reduce((sum: number, i: any) => sum + (Number(i.weight) || 0), 0);
      (project as any).subTotal = items.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    }

    if (data.gstRate !== undefined) {
      (project as any).gstRate = Number(data.gstRate);
    }

    const subTotal = Number((project as any).subTotal) || 0;
    const gstRate = Number((project as any).gstRate) || 0;
    (project as any).gstAmount = subTotal * (gstRate / 100);
    (project as any).totalAmount = subTotal + (Number((project as any).gstAmount) || 0);

    return project.save();
  }

  async deleteCollection(projectId: string, userId: string, userRole: string, _req?: any): Promise<void> {
    await this.databaseService.ensureConnectionReady();
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    const project = await this.projectModel.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    });

    if (!project) {
      throw new NotFoundException('Collection not found');
    }

    const requesterId = userId ? new Types.ObjectId(userId) : null;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      if (!requesterId) {
        throw new NotFoundException('Collection not found');
      }
      if (userRole === 'user') {
        if (String(project.userId) !== String(requesterId)) {
          throw new NotFoundException('Collection not found');
        }
      }
      if (userRole === 'agent') {
        const isOwner = String(project.userId) === String(requesterId);
        const isCollector = project.collectedBy ? String(project.collectedBy) === String(requesterId) : false;
        if (!isOwner && !isCollector) {
          throw new NotFoundException('Collection not found');
        }
      }
    }

    (project as any).isDeleted = true;
    (project as any).deletedAt = new Date();
    await project.save();
  }

  async transferCollection(projectId: string, newUserId: string, _adminId: string, _req?: any): Promise<ProjectDocument> {
    await this.databaseService.ensureConnectionReady();
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');
    const newUserObjectId = this.validationService.validateObjectId(newUserId, 'newUserId');

    const project = await this.projectModel.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    });

    if (!project) {
      throw new NotFoundException('Collection not found');
    }

    project.collectedBy = newUserObjectId;

    // Keep lightweight audit trail on the document if present.
    if (!project.modificationHistory) {
      project.modificationHistory = [];
    }
    project.modificationHistory.push({
      modifiedBy: new Types.ObjectId(_adminId),
      modifiedAt: new Date(),
      action: 'transferred',
      notes: `Transferred to ${newUserId}`,
    } as any);

    return project.save();
  }

  async getCollectionStatistics(filters?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();

    const match: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    if (filters?.serviceType) {
      match.serviceType = filters.serviceType;
    }

    if (filters?.status) {
      match.status = filters.status;
    }

    // Role-based filtering (keep consistent with getAllProjects)
    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      match.$or = [{ collectedBy: userObjectId }, { userId: userObjectId }];
    } else if (filters?.userRole === 'user' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      match.userId = userObjectId;
    }

    // Date range on collectionDate (more meaningful for collections)
    if (filters?.startDate || filters?.endDate) {
      match.collectionDate = {};
      if (filters.startDate) {
        (match.collectionDate as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (match.collectionDate as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
    ];

    const rows = await this.projectModel.aggregate(pipeline as any);
    const byStatus: Record<string, { count: number; totalWeight: number; totalAmount: number }> = {};
    let total = 0;
    let totalWeight = 0;
    let totalAmount = 0;
    for (const row of rows) {
      const status = String(row._id || 'unknown');
      byStatus[status] = {
        count: Number(row.count) || 0,
        totalWeight: Number(row.totalWeight) || 0,
        totalAmount: Number(row.totalAmount) || 0,
      };
      total += byStatus[status].count;
      totalWeight += byStatus[status].totalWeight;
      totalAmount += byStatus[status].totalAmount;
    }

    return {
      success: true,
      data: {
        total,
        totalWeight,
        totalAmount,
        byStatus,
      },
    };
  }

  async getProjectStats(filters?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();

    const baseQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    if (filters?.serviceType) {
      baseQuery.serviceType = filters.serviceType;
    }

    // Role-based filtering
    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.$or = [{ collectedBy: userObjectId }, { userId: userObjectId }];
    } else if (filters?.userRole === 'user' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.userId = userObjectId;
    }

    if (filters?.startDate || filters?.endDate) {
      baseQuery.createdAt = {};
      if (filters.startDate) {
        (baseQuery.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (baseQuery.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const pipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
    ];

    const result = await this.projectModel.aggregate(pipeline as any);
    const stats = result?.[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      totalWeight: 0,
      totalAmount: 0,
    };

    return {
      success: true,
      data: {
        total: stats.total,
        pending: stats.pending,
        inProgress: stats.inProgress,
        completed: stats.completed,
        totalWeight: stats.totalWeight,
        totalAmount: stats.totalAmount,
      },
    };
  }

  async getCollectionAnalytics(filters?: any): Promise<any> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    const baseQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      baseQuery.createdAt = {};
      if (filters.startDate) {
        (baseQuery.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (baseQuery.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    // Service type filter
    if (filters?.serviceType) {
      baseQuery.serviceType = filters.serviceType;
    }

    // Status filter
    if (filters?.status) {
      baseQuery.status = filters.status;
    }

    // Role-based filtering
    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.$or = [
        { collectedBy: userObjectId },
        { userId: userObjectId },
      ];
    } else if (filters?.userRole === 'user' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.userId = userObjectId;
    }

    // Determine granularity (daily, weekly, monthly)
    const granularity = filters?.granularity || 'daily';
    let dateGroupFormat: Record<string, unknown>;

    switch (granularity) {
      case 'weekly':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'monthly':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case 'daily':
      default:
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
    }

    // Time-series aggregation pipeline
    const timeSeriesPipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: dateGroupFormat,
          date: { $first: '$createdAt' },
          count: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totalValue', 0] } },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
        },
      },
      { $sort: { date: 1 } },
    ];

    // Overall statistics pipeline
    const overallStatsPipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totalValue', 0] } },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          completedCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pendingCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgressCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
          byServiceType: {
            $push: {
              serviceType: '$serviceType',
              value: { $ifNull: ['$totalValue', 0] },
              weight: { $ifNull: ['$totalWeight', 0] },
            },
          },
        },
      },
    ];

    // Execute both pipelines in parallel
    const [timeSeries, overallStats] = await Promise.all([
      this.projectModel.aggregate(timeSeriesPipeline as any),
      this.projectModel.aggregate(overallStatsPipeline as any),
    ]);

    // Format time-series data
    const formattedTimeSeries = timeSeries.map((item) => {
      const date = new Date(item.date);
      let dateKey: string;

      switch (granularity) {
        case 'weekly': {
          // Get week number (1-52/53)
          const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
          dateKey = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
          break;
        }
        case 'monthly':
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'daily':
        default:
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
      }

      return {
        date: dateKey,
        timestamp: date.toISOString(),
        count: item.count,
        revenue: item.totalRevenue,
        weight: item.totalWeight,
        completed: item.completed,
        pending: item.pending,
        inProgress: item.inProgress,
      };
    });

    // Format overall statistics
    const stats = overallStats[0] || {
      totalCollections: 0,
      totalRevenue: 0,
      totalWeight: 0,
      completedCollections: 0,
      pendingCollections: 0,
      inProgressCollections: 0,
      byServiceType: [],
    };

    // Calculate service type breakdown
    const byServiceType: Record<string, { count: number; revenue: number; weight: number }> = {};
    if (stats.byServiceType) {
      for (const item of stats.byServiceType) {
        if (item.serviceType) {
          if (!byServiceType[item.serviceType]) {
            byServiceType[item.serviceType] = { count: 0, revenue: 0, weight: 0 };
          }
          byServiceType[item.serviceType].count += 1;
          byServiceType[item.serviceType].revenue += item.value;
          byServiceType[item.serviceType].weight += item.weight;
        }
      }
    }

    return {
      success: true,
      data: {
        timeSeries: formattedTimeSeries,
        overall: {
          totalCollections: stats.totalCollections,
          totalRevenue: stats.totalRevenue,
          totalWeight: stats.totalWeight,
          completedCollections: stats.completedCollections,
          pendingCollections: stats.pendingCollections,
          inProgressCollections: stats.inProgressCollections,
          averageCollectionValue: stats.totalCollections > 0
            ? stats.totalRevenue / stats.totalCollections
            : 0,
          byServiceType,
        },
        granularity,
      },
    };
  }

  async getFinancialAnalytics(filters?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();

    const baseQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    if (filters?.serviceType) {
      baseQuery.serviceType = filters.serviceType;
    }

    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.$or = [{ collectedBy: userObjectId }, { userId: userObjectId }];
    } else if (filters?.userRole === 'user' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.userId = userObjectId;
    }

    if (filters?.startDate || filters?.endDate) {
      baseQuery.collectionDate = {};
      if (filters.startDate) {
        (baseQuery.collectionDate as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (baseQuery.collectionDate as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const pipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          subTotal: { $sum: { $ifNull: ['$subTotal', 0] } },
          gstAmount: { $sum: { $ifNull: ['$gstAmount', 0] } },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
    ];

    const result = await this.projectModel.aggregate(pipeline as any);
    const row = result?.[0] || {
      totalCollections: 0,
      totalWeight: 0,
      subTotal: 0,
      gstAmount: 0,
      totalAmount: 0,
    };

    return {
      success: true,
      data: {
        totalCollections: row.totalCollections,
        totalWeight: row.totalWeight,
        subTotal: row.subTotal,
        gstAmount: row.gstAmount,
        totalAmount: row.totalAmount,
        averageCollectionValue: row.totalCollections > 0 ? row.totalAmount / row.totalCollections : 0,
      },
    };
  }

  async getTimeSeriesAnalytics(filters?: any): Promise<any> {
    await this.databaseService.ensureConnectionReady();

    const baseQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    if (filters?.serviceType) {
      baseQuery.serviceType = filters.serviceType;
    }

    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.$or = [{ collectedBy: userObjectId }, { userId: userObjectId }];
    } else if (filters?.userRole === 'user' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.userId = userObjectId;
    }

    const granularity = filters?.granularity || 'daily';
    const dateField = filters?.dateField || 'collectionDate';

    if (filters?.startDate || filters?.endDate) {
      baseQuery[dateField] = {};
      if (filters.startDate) {
        (baseQuery[dateField] as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (baseQuery[dateField] as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    let groupId: Record<string, unknown>;
    if (granularity === 'monthly') {
      groupId = { y: { $year: `$${dateField}` }, m: { $month: `$${dateField}` } };
    } else if (granularity === 'weekly') {
      groupId = { y: { $year: `$${dateField}` }, w: { $isoWeek: `$${dateField}` } };
    } else {
      groupId = {
        y: { $year: `$${dateField}` },
        m: { $month: `$${dateField}` },
        d: { $dayOfMonth: `$${dateField}` },
      };
    }

    const pipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
      { $sort: { '_id.y': 1 } },
    ];

    const series = await this.projectModel.aggregate(pipeline as any);
    return {
      success: true,
      data: {
        granularity,
        series,
      },
    };
  }

  async getAgentPerformanceAnalytics(filters?: any): Promise<any> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    const baseQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    };

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      baseQuery.createdAt = {};
      if (filters.startDate) {
        (baseQuery.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (baseQuery.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    // Service type filter
    if (filters?.serviceType) {
      baseQuery.serviceType = filters.serviceType;
    }

    // Role-based filtering
    if (filters?.userRole === 'agent' && filters?.userId) {
      const userObjectId = this.validationService.validateObjectId(filters.userId, 'userId');
      baseQuery.$or = [
        { collectedBy: userObjectId },
        { userId: userObjectId },
      ];
    }

    // Aggregation pipeline for agent performance
    const pipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: '$collectedBy',
          totalCollections: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totalValue', 0] } },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          completedCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent',
        },
      },
      { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'agent.role': 'agent',
          'agent.isDeleted': { $ne: true },
        },
      },
      {
        $project: {
          agentId: '$_id',
          agentName: { $ifNull: ['$agent.name', 'Unknown'] },
          agentEmail: { $ifNull: ['$agent.email', ''] },
          totalCollections: 1,
          totalRevenue: 1,
          totalWeight: 1,
          completedCollections: 1,
          averageCollectionValue: { $divide: ['$totalRevenue', '$totalCollections'] },
        },
      },
      { $sort: { totalCollections: -1 } },
    ];

    const agents = await this.projectModel.aggregate(pipeline as any);

    // Calculate team averages
    const teamAverages = agents.length > 0
      ? {
        averageCollections: agents.reduce((sum, a) => sum + a.totalCollections, 0) / agents.length,
        averageRevenue: agents.reduce((sum, a) => sum + a.totalRevenue, 0) / agents.length,
        averageWeight: agents.reduce((sum, a) => sum + a.totalWeight, 0) / agents.length,
        averageCollectionsPerDay: 0, // Would need date range calculation
        averageCollectionValue: agents.reduce((sum, a) => sum + a.averageCollectionValue, 0) / agents.length,
      }
      : {
        averageCollections: 0,
        averageRevenue: 0,
        averageWeight: 0,
        averageCollectionsPerDay: 0,
        averageCollectionValue: 0,
      };

    // Build leaderboard
    const leaderboard = {
      byCollections: [...agents].sort((a, b) => b.totalCollections - a.totalCollections).slice(0, 10),
      byRevenue: [...agents].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
      byWeight: [...agents].sort((a, b) => b.totalWeight - a.totalWeight).slice(0, 10),
    };

    return {
      success: true,
      data: {
        agents,
        leaderboard,
        teamAverages,
      },
    };
  }

  async getMyCollectionAnalytics(userId: string, filters?: any): Promise<any> {
    // Ensure database connection is ready
    await this.databaseService.ensureConnectionReady();

    const userObjectId = this.validationService.validateObjectId(userId, 'userId');

    const baseQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
      $or: [
        { userId: userObjectId },
        { collectedBy: userObjectId },
      ],
    };

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      baseQuery.createdAt = {};
      if (filters.startDate) {
        (baseQuery.createdAt as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (baseQuery.createdAt as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    // Service type filter
    if (filters?.serviceType) {
      baseQuery.serviceType = filters.serviceType;
    }

    // Status filter
    if (filters?.status) {
      baseQuery.status = filters.status;
    }

    // Use aggregation pipeline for efficient analytics
    const pipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totalValue', 0] } },
          totalWeight: { $sum: { $ifNull: ['$totalWeight', 0] } },
          completedCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pendingCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgressCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCollections: 1,
          totalRevenue: 1,
          totalWeight: 1,
          completedCollections: 1,
          pendingCollections: 1,
          inProgressCollections: 1,
          averageCollectionValue: {
            $cond: [
              { $gt: ['$totalCollections', 0] },
              { $divide: ['$totalRevenue', '$totalCollections'] },
              0,
            ],
          },
        },
      },
    ];

    // Get breakdown by service type separately (simpler approach)
    const byServiceTypePipeline: any[] = [
      { $match: baseQuery },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalValue', 0] } },
          weight: { $sum: { $ifNull: ['$totalWeight', 0] } },
        },
      },
    ];

    const [result, serviceTypeBreakdown] = await Promise.all([
      this.projectModel.aggregate(pipeline as any),
      this.projectModel.aggregate(byServiceTypePipeline as any),
    ]);

    // Format service type breakdown
    const byServiceType: Record<string, { count: number; revenue: number; weight: number }> = {};
    for (const item of serviceTypeBreakdown) {
      if (item._id) {
        byServiceType[item._id] = {
          count: item.count,
          revenue: item.revenue,
          weight: item.weight,
        };
      }
    }

    const analytics = result[0] ? {
      ...result[0],
      byServiceType,
    } : {
      totalCollections: 0,
      totalRevenue: 0,
      totalWeight: 0,
      completedCollections: 0,
      pendingCollections: 0,
      inProgressCollections: 0,
      averageCollectionValue: 0,
      byServiceType: {},
    };

    return {
      success: true,
      data: analytics,
    };
  }

  async getDeletedCollections(filters?: any): Promise<{
    projects: ProjectDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.databaseService.ensureConnectionReady();

    const validatedPage = this.paginationService.validatePage(filters?.page, 1);
    const validatedLimit = this.paginationService.validateLimit(
      filters?.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );
    const skip = this.paginationService.calculateSkip(validatedPage, validatedLimit);

    const filter: Record<string, unknown> = {
      $or: [
        { isDeleted: true },
        { deletedAt: { $exists: true } },
      ],
    };

    if (filters?.serviceType) {
      filter.serviceType = filters.serviceType;
    }

    if (filters?.search) {
      const search = String(filters.search);
      filter.$and = [
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { locationName: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const [projects, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('userId', 'name email')
        .populate('collectedBy', 'name email')
        .populate('locationId', 'locationName address city state')
        .sort({ deletedAt: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(validatedLimit)
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    return {
      projects,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: this.paginationService.calculateTotalPages(total, validatedLimit),
    };
  }

  async restoreCollection(projectId: string, _adminId: string, _req?: any): Promise<ProjectDocument> {
    await this.databaseService.ensureConnectionReady();
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    const project = await this.projectModel.findById(projectObjectId).exec();
    if (!project) {
      throw new NotFoundException('Collection not found');
    }

    project.isDeleted = false;
    project.deletedAt = undefined;
    return project.save();
  }

  async permanentlyDeleteCollection(projectId: string, _adminId: string, _req?: any): Promise<void> {
    await this.databaseService.ensureConnectionReady();
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    const result = await this.projectModel.deleteOne({ _id: projectObjectId }).exec();
    if (!result.deletedCount) {
      throw new NotFoundException('Collection not found');
    }
  }

  async validateCollectionsImport(
    fileData: any,
    _userId: string,
    _userRole: string,
    filename?: string,
  ): Promise<any> {
    const importService = await import('./project.import.service');
    // validateCollectionsImport takes (fileData, filename?)
    return importService.validateCollectionsImport(fileData, filename);
  }

  async importCollections(
    fileData: any,
    userId: string,
    _userRole: string,
    _req?: any,
    filename?: string,
  ): Promise<any> {
    const importService = await import('./project.import.service');
    // importCollections takes (fileData, createdBy, filename?)
    return importService.importCollections(fileData, userId, filename);
  }

  async getCollectionsImportTemplate(): Promise<any> {
    const importService = await import('./project.import.service');
    return importService.getImportTemplate();
  }

  // Helper method to get project by ID (for Receipt service)
  // Excludes deleted projects
  async findById(projectId: string): Promise<ProjectDocument | null> {
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');
    return this.projectModel.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();
  }

  // Helper method to find project by ID (including deleted) - for Receipt service debugging
  async findByIdIncludeDeleted(projectId: string): Promise<ProjectDocument | null> {
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');
    return this.projectModel.findById(projectObjectId).exec();
  }

  // Helper method to find project by query (for Receipt service)
  async findOne(query: Record<string, unknown>): Promise<ProjectDocument | null> {
    return this.projectModel.findOne({
      ...query,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();
  }

  // Helper method to update project receipt number (for Receipt service)
  async updateReceiptNumber(
    projectId: string,
    receiptNumber: string,
    generatedBy: Types.ObjectId,
  ): Promise<ProjectDocument> {
    const projectObjectId = this.validationService.validateObjectId(projectId, 'projectId');

    const project = await this.projectModel.findOne({
      _id: projectObjectId,
      isDeleted: { $ne: true },
      deletedAt: { $exists: false },
    }).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.receiptNumber = receiptNumber;

    // Add receipt generation to audit trail
    if (!project.modificationHistory) {
      project.modificationHistory = [];
    }
    project.modificationHistory.push({
      modifiedBy: generatedBy,
      modifiedAt: new Date(),
      action: 'receipt_generated',
      notes: `Receipt ${receiptNumber} generated`,
    });

    return project.save();
  }

  // Get the Mongoose model instance (for Receipt service compatibility)
  // This allows Receipt to use Project.findById, Project.findOne, etc.
  getModel(): Model<ProjectDocument> {
    return this.projectModel;
  }
}

// Export wrapper functions for Express services that import as namespace
// These allow analytics-report.service.ts to call ProjectService methods
let projectServiceInstance: ProjectService | null = null;

export const getProjectServiceInstance = (): ProjectService => {
  if (!projectServiceInstance) {
    throw new Error('ProjectService instance not initialized. This should only be called from NestJS context.');
  }
  return projectServiceInstance;
};

export const setProjectServiceInstance = (instance: ProjectService): void => {
  projectServiceInstance = instance;
};

// Wrapper functions for Express services
export const getMyCollectionAnalytics = async (userId: string, filters?: any): Promise<any> => {
  const instance = getProjectServiceInstance();
  return instance.getMyCollectionAnalytics(userId, filters);
};

export const getAgentPerformanceAnalytics = async (filters?: any): Promise<any> => {
  const instance = getProjectServiceInstance();
  return instance.getAgentPerformanceAnalytics(filters);
};

export const getCollectionAnalytics = async (filters?: any): Promise<any> => {
  const instance = getProjectServiceInstance();
  return instance.getCollectionAnalytics(filters);
};

