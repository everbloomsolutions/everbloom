import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: UserDocument,
    @Query() query: NotificationQueryDto,
  ) {
    const result = await this.notificationService.getUserNotifications(
      user._id.toString(),
      query,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: UserDocument) {
    const result = await this.notificationService.getUserNotifications(user._id.toString(), {});
    return {
      success: true,
      data: { count: result.unreadCount },
    };
  }

  @Get(':id')
  async getNotificationById(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const notification = await this.notificationService.getNotificationById(id);

    // Security: verify notification belongs to user
    if (notification.user.toString() !== user._id.toString()) {
      throw new Error('Notification not found');
    }

    return {
      success: true,
      data: notification,
    };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: UserDocument) {
    await this.notificationService.markAllAsRead(user._id.toString());
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const notification = await this.notificationService.markAsRead(id, user._id.toString());
    return {
      success: true,
      data: { notification },
      message: 'Notification marked as read',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAllNotifications(@CurrentUser() user: UserDocument) {
    await this.notificationService.deleteAllNotifications(user._id.toString());
    return {
      success: true,
      message: 'All notifications deleted successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    await this.notificationService.deleteNotification(id, user._id.toString());
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    const notification = await this.notificationService.createNotification(createNotificationDto);
    return {
      success: true,
      data: notification,
      message: 'Notification created successfully',
    };
  }
}
