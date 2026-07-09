import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserDocument } from '../user/schemas/user.schema';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Body() createEventDto: CreateAnalyticsEventDto,
    @CurrentUser() user: UserDocument | undefined,
    @Req() req: any,
  ) {
    const event = await this.analyticsService.createAnalyticsEvent(
      createEventDto,
      user?._id.toString(),
      req.ip,
      req.get('user-agent'),
    );

    return {
      success: true,
      data: { event },
      message: 'Analytics event created',
    };
  }

  @Get('events')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getEvents(@Query() query: AnalyticsQueryDto) {
    const result = await this.analyticsService.getAnalyticsEvents(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('stats/:eventType')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getStats(
    @Param('eventType') eventType: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.analyticsService.getEventStats(
      eventType,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: stats,
    };
  }
}
