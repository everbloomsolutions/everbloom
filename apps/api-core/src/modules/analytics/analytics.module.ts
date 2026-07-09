import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsEvent, AnalyticsEventSchema } from './schemas/analytics-event.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsReportController } from './analytics.report.controller';
import { AnalyticsReportService } from './analytics.report.service';
import { ProjectModule } from '../project/project.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
    ProjectModule,
    LocationModule,
  ],
  controllers: [AnalyticsController, AnalyticsReportController],
  providers: [AnalyticsService, AnalyticsReportService],
  exports: [AnalyticsService, AnalyticsReportService],
})
export class AnalyticsModule {}
