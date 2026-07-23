import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { SchedulerModule } from './infrastructure/scheduler/scheduler.module';
import { SocketModule } from './infrastructure/socket/socket.module';
import { CloudinaryModule } from './config/cloudinary.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { RootModule } from './modules/root/root.module';
import { ContentModule } from './modules/content/content.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ProjectModule } from './modules/project/project.module';
import { LocationModule } from './modules/location/location.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReceiptModule } from './modules/receipt/receipt.module';
import { AdminModule } from './modules/admin/admin.module';
import { configuration } from './config/configuration';
import { validateConfig } from './config/config.validation';
import { InitializationService } from './config/runtime/initialization.service';
import { BootstrapService } from './config/runtime/bootstrap.service';
import { SecurityService } from './config/runtime/security.service';
import { MiddlewareService } from './config/runtime/middleware.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate: validateConfig,
      envFilePath: configuration().isProduction || configuration().isVercel
        ? (false as any)
        : ['.env.local', '.env', '.env.development'],
      ignoreEnvFile: configuration().isProduction || configuration().isVercel,
      expandVariables: false,
    }),
    DatabaseModule,
    RedisModule,
    LoggerModule,
    MailModule,
    SchedulerModule.forRoot({ redisUrl: configuration().redisUrl }),
    SocketModule.forRoot(configuration().isVercel || process.env.DISABLE_WEBSOCKET === '1'),
    CloudinaryModule,
    CommonModule,
    HealthModule,
    RootModule,
    AuthModule,
    UserModule,
    ContentModule,
    NotificationModule,
    AnalyticsModule,
    ProjectModule,
    LocationModule,
    AuditModule,
    ReceiptModule,
    AdminModule,
  ],
  providers: [
    InitializationService,
    BootstrapService,
    SecurityService,
    MiddlewareService,
  ],
})
export class AppModule { }
