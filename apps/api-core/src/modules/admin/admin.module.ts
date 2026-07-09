import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AssignmentController } from './assignment.controller';
import { JobController } from './job.controller';
import { AdminService, UserAdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { LocationModule } from '../location/location.module';
import { ProjectModule } from '../project/project.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SchedulerModule } from '../../infrastructure/scheduler/scheduler.module';
import { CommonModule } from '../../common/common.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { Location, LocationSchema } from '../location/schemas/location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Location.name, schema: LocationSchema },
    ]),
    CommonModule, // Provides PaginationService, ValidationService, DatabaseService
    UserModule,
    LocationModule,
    ProjectModule,
    AnalyticsModule,
    SchedulerModule.forRoot(),
  ],
  controllers: [AdminController, AssignmentController, JobController],
  providers: [AdminService, UserAdminService],
  exports: [AdminService, UserAdminService],
})
export class AdminModule { }
