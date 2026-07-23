import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument } from './schemas/analytics-event.schema';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { PaginationService } from '../../common/pagination/pagination.service';
import { ValidationService } from '../../common/validation/validation.service';
import { PAGINATION } from '../../config/constants';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsEvent.name) private analyticsEventModel: Model<AnalyticsEventDocument>,
    @Inject(PaginationService) private paginationService: PaginationService,
    @Inject(ValidationService) private validationService: ValidationService,
  ) {}

  async createAnalyticsEvent(
    data: CreateAnalyticsEventDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AnalyticsEventDocument> {
    const event = await this.analyticsEventModel.create({
      eventType: data.eventType,
      userId: userId ? this.validationService.validateObjectId(userId, 'userId') : undefined,
      sessionId: data.sessionId,
      properties: data.properties || {},
      ipAddress,
      userAgent,
    });

    return event;
  }

  async getAnalyticsEvents(query: AnalyticsQueryDto): Promise<{
    events: AnalyticsEventDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const validatedPage = this.paginationService.validatePage(query.page, 1);
    const validatedLimit = this.paginationService.validateLimit(
      query.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );

    const filter: Record<string, unknown> = {};

    if (query.eventType) {
      filter.eventType = query.eventType;
    }

    if (query.userId) {
      filter.userId = this.validationService.validateObjectId(query.userId, 'userId');
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const skip = this.paginationService.calculateSkip(validatedPage, validatedLimit);

    const [events, total] = await Promise.all([
      this.analyticsEventModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validatedLimit)
        .exec(),
      this.analyticsEventModel.countDocuments(filter),
    ]);

    return {
      events,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: this.paginationService.calculateTotalPages(total, validatedLimit),
    };
  }

  async getAnalyticsStats(
    eventType: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    uniqueUsers: number;
    dateRange: {
      start: Date;
      end: Date;
    };
  }> {
    return this.getEventStats(eventType, startDate, endDate);
  }

  async getEventStats(
    eventType: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    uniqueUsers: number;
    dateRange: {
      start: Date;
      end: Date;
    };
  }> {
    const filter: Record<string, unknown> = {
      eventType,
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        (filter.createdAt as Record<string, unknown>).$gte = startDate;
      }
      if (endDate) {
        (filter.createdAt as Record<string, unknown>).$lte = endDate;
      }
    }

    const [total, userIds] = await Promise.all([
      this.analyticsEventModel.countDocuments(filter),
      this.analyticsEventModel.distinct('userId', filter),
    ]);

    const uniqueUsers = userIds.length;

    return {
      total,
      uniqueUsers,
      dateRange: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    };
  }
}
