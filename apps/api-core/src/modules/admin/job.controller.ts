import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';
import { SchedulerQueueService } from '../../infrastructure/scheduler/scheduler-queue.service';

@Controller('admin/jobs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin', 'agent')
export class JobController {
  constructor(private readonly schedulerQueueService: SchedulerQueueService) {}

  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const status = await this.schedulerQueueService.getJobStatus(jobId);

    if (!status) {
      throw new NotFoundException('Job not found');
    }

    return {
      success: true,
      data: status,
    };
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('jobId') jobId: string) {
    const cancelled = await this.schedulerQueueService.cancelJob(jobId);

    if (!cancelled) {
      throw new NotFoundException('Job not found or could not be cancelled');
    }

    return {
      success: true,
      message: 'Job cancelled successfully',
    };
  }
}
