import { Injectable, NotFoundException, ForbiddenException, Logger, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { PaginationService } from '../../common/pagination/pagination.service';
import { ValidationService } from '../../common/validation/validation.service';
import { PAGINATION } from '../../config/constants';
import { SocketGateway } from '../../infrastructure/socket/socket.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @Optional() @Inject(SocketGateway) private readonly socketGateway: SocketGateway | undefined,
    @Inject(PaginationService) private paginationService: PaginationService,
    @Inject(ValidationService) private validationService: ValidationService,
  ) {}

  async createNotification(data: CreateNotificationDto): Promise<NotificationDocument> {
    const userObjectId = this.validationService.validateObjectId(data.userId, 'userId');

    const notification = await this.notificationModel.create({
      user: userObjectId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link,
      metadata: data.metadata || {},
    });

    // Emit real-time notification to user
    this.socketGateway?.emitToUser(
      data.userId,
      'notification:new',
      {
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          link: notification.link,
          createdAt: (notification as any).createdAt,
        },
      },
    );

    // Emit unread count update
    const unreadCount = await this.notificationModel.countDocuments({
      user: userObjectId,
      isRead: false,
    });
    this.socketGateway?.emitToUser(data.userId, 'notification:unread-count', { count: unreadCount });

    return notification;
  }

  async createBatchNotifications(
    notifications: CreateNotificationDto[],
  ): Promise<NotificationDocument[]> {
    const notificationDocs = notifications.map((data) => ({
      user: this.validationService.validateObjectId(data.userId, 'userId'),
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link,
      metadata: data.metadata || {},
    }));

    const created = await this.notificationModel.insertMany(notificationDocs);
    return created;
  }

  async getNotificationById(notificationId: string): Promise<NotificationDocument> {
    const notificationObjectId = this.validationService.validateObjectId(notificationId, 'notificationId');
    const notification = await this.notificationModel.findById(notificationObjectId).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getNotifications(
    userId: string,
    query: NotificationQueryDto = {},
  ): Promise<{
    notifications: NotificationDocument[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.getUserNotifications(userId, query);
  }

  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto = {},
  ): Promise<{
    notifications: NotificationDocument[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const userObjectId = this.validationService.validateObjectId(userId, 'userId');
    const validatedPage = this.paginationService.validatePage(query.page, 1);
    const validatedLimit = this.paginationService.validateLimit(
      query.limit,
      PAGINATION.MAX_LIMIT,
      PAGINATION.DEFAULT_LIMIT,
    );

    const filter: Record<string, unknown> = {
      user: userObjectId,
    };

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    if (query.type) {
      filter.type = query.type;
    }

    const skip = this.paginationService.calculateSkip(validatedPage, validatedLimit);

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validatedLimit)
        .exec(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({ user: userObjectId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: this.paginationService.calculateTotalPages(total, validatedLimit),
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationDocument> {
    const notificationObjectId = this.validationService.validateObjectId(notificationId, 'notificationId');
    const userObjectId = this.validationService.validateObjectId(userId, 'userId');

    const notification = await this.notificationModel.findById(notificationObjectId).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user.toString() !== userObjectId.toString()) {
      throw new ForbiddenException('You do not have permission to update this notification');
    }

    notification.isRead = true;
    await notification.save();

    // Emit real-time update
    this.socketGateway?.emitToUser(userId, 'notification:read', { notificationId: notification._id.toString() });

    // Emit unread count update
    const unreadCount = await this.notificationModel.countDocuments({
      user: userObjectId,
      isRead: false,
    });
    this.socketGateway?.emitToUser(userId, 'notification:unread-count', { count: unreadCount });

    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userObjectId = this.validationService.validateObjectId(userId, 'userId');

    await this.notificationModel.updateMany(
      { user: userObjectId, isRead: false },
      { isRead: true },
    );

    // Emit unread count update (should be 0 after marking all as read)
    this.socketGateway?.emitToUser(userId, 'notification:unread-count', { count: 0 });
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notificationObjectId = this.validationService.validateObjectId(notificationId, 'notificationId');
    const userObjectId = this.validationService.validateObjectId(userId, 'userId');

    const notification = await this.notificationModel.findById(notificationObjectId).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user.toString() !== userObjectId.toString()) {
      throw new ForbiddenException('You do not have permission to delete this notification');
    }

    await this.notificationModel.findByIdAndDelete(notificationObjectId).exec();
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    const userObjectId = this.validationService.validateObjectId(userId, 'userId');
    await this.notificationModel.deleteMany({ user: userObjectId }).exec();
  }
}
