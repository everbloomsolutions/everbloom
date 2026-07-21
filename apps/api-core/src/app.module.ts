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
      // Explicitly control .env file loading
      // In production/Vercel: completely disable .env file loading
      // In development: allow .env files
      envFilePath: (() => {
        const isVercel = !!process.env.VERCEL;
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction || isVercel) {
          // Return false to explicitly disable .env file loading
          // This prevents NestJS from auto-discovering .env files
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ConfigModule envFile type does not accept false
          return false as any;
        }

        // Development: load .env files
        return [
          '.env.local',
          '.env',
          '.env.development',
        ].filter(Boolean) as string[];
      })(),
      // Explicitly ignore .env files in production/Vercel
      ignoreEnvFile: (() => {
        const isVercel = !!process.env.VERCEL;
        const isProduction = process.env.NODE_ENV === 'production';
        return isProduction || isVercel;
      })(),
      // Don't expand variables from process.env - use only what configuration() returns
      // This ensures our configuration function's values take precedence
      expandVariables: false,
    }),
    DatabaseModule,
    RedisModule,
    LoggerModule,
    MailModule,
    SchedulerModule.forRoot(),
    SocketModule.forRoot(),
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
