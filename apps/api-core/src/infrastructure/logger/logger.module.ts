import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';

/**
 * Logger Module
 * 
 * Global module providing LoggerService throughout the application.
 * Uses Global decorator so LoggerService can be injected anywhere without
 * importing the module.
 */
@Global()
@Module({
  imports: [ConfigModule], // Ensure ConfigService is available for LoggerService
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
